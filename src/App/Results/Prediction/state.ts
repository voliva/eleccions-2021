import { Party, PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { Votes, votes$ } from "@/api/votes"
import { add } from "@/utils/add"
import { mapRecord } from "@/utils/record-utils"
import { reduceRecord } from "@/utils/reduceRecord"
import { bind, shareLatest } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { combineLatest, merge, Observable } from "rxjs"
import {
  filter,
  map,
  mapTo,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs/operators"
import { selectedProvince$ } from "../components/AreaPicker"
import { createResultStreams, totalCounts$ } from "../state/results"

type Prediction = Record<Provinces, Record<PartyId, number>>

const votesWithPartyVotes$ = votes$.pipe(
  map((provinces) =>
    mapRecord(provinces, (results) => ({
      ...results,
      partyVotes: reduceRecord(results.parties, add),
    })),
  ),
)

// Decision: % whites and nils remains constant, user selects part from 0->100% of not counted party votes (totalVotes - estimatedWhite - estimatedNil)
const automaticPrediction$ = votesWithPartyVotes$.pipe(
  map(
    (provinces): Prediction =>
      mapRecord(provinces, ({ parties, partyVotes }) =>
        mapRecord(parties, (votes) => votes / partyVotes),
      ),
  ),
)

const [predictionEdit$, editPrediction] = createListener<Prediction>()
const editedPrediction$ = predictionEdit$.pipe(startWith(null), shareLatest())

const [predictionCommit$, commitPrediction] = createListener()
const [predictionReset$, resetPrediction] = createListener()
const commitedPrediction$ = merge(
  predictionCommit$.pipe(
    withLatestFrom(predictionEdit$),
    map(([_, p]) => p),
  ),
  predictionReset$.pipe(mapTo(null)),
).pipe(startWith(null), shareLatest())

export { commitPrediction, resetPrediction }

// Used as a baseline for editing, so the same value always yields the same result
// Also used for the order: This way it doesn't change while the user is editing
const initialPrediction$ = combineLatest([
  automaticPrediction$,
  commitedPrediction$,
]).pipe(map(([automatic, commited]) => commited || automatic))

const visiblePrediction$ = combineLatest([
  initialPrediction$,
  editedPrediction$,
]).pipe(map(([initial, edited]) => edited || initial))

const globalPrediction$ = combineLatest([
  visiblePrediction$,
  totalCounts$,
  votesWithPartyVotes$,
]).pipe(
  map(([prediction, counts, results]) => {
    const toCount = mapRecord(
      counts,
      ({ nVoters, counted }) => nVoters - counted,
    )

    // Assume %nils and %whites remains constant throughout counts
    const noPartyCount = mapRecord(
      results,
      ({ partyVotes, white, nil }, province) => {
        const totalVotes = partyVotes + white + nil
        return ((white + nil) / totalVotes) * toCount[province]
      },
    )

    const votesPredicted = mapRecord(
      prediction,
      (provincePrediction, province) =>
        mapRecord(
          provincePrediction,
          (prediction) =>
            (toCount[province] - noPartyCount[province]) * prediction,
        ),
    )
    const globalVotesPredicted = reduceRecord(votesPredicted, (acc, votes) => ({
      ...acc,
      ...mapRecord(votes, (v, party) => v + (acc[party] || 0)),
    }))
    const totalVotesPredicted = reduceRecord(globalVotesPredicted, add)

    const result = mapRecord(
      globalVotesPredicted,
      (votes) => votes / totalVotesPredicted,
    )
    return result
  }),
)

// With province selected
const activePrediction$ = selectedProvince$.pipe(
  switchMap((province) =>
    province
      ? visiblePrediction$.pipe(map((prediction) => prediction[province]))
      : globalPrediction$,
  ),
)

export const [usePartyPrediction, partyPrediction$] = bind((party: PartyId) =>
  activePrediction$.pipe(map((prediction) => prediction[party])),
)

// Results
const { getResults$: initialPredictedResult$ } = predictionToResult$(
  initialPrediction$,
)

export const commitedResult$ = selectedProvince$.pipe(
  switchMap(initialPredictedResult$),
  shareLatest(),
)

const { getResults$: visiblePredictedResult$ } = predictionToResult$(
  visiblePrediction$,
)

export const predictedResult$ = selectedProvince$.pipe(
  switchMap(visiblePredictedResult$),
  shareLatest(),
)

// Editing specific parties
const [partyPredictionEdit$, editPartyPrediction] = createListener<{
  party: PartyId
  prediction: number
}>()
export { editPartyPrediction }

partyPredictionEdit$
  .pipe(
    withLatestFrom(combineLatest([selectedProvince$, initialPrediction$])),
    map(([edit, [province, initialPrediction]]) => ({
      edit,
      province,
      initialPrediction,
    })),
    // Only considering specific provinces for now
    filter(({ province }) => !!province),
    map(({ edit, province, initialPrediction }) => {
      const {
        [province!]: targetInitialPrediction,
        ...rest
      } = initialPrediction
      const restProvinces = rest as Prediction

      return {
        ...restProvinces,
        [province!]: editPercent(
          targetInitialPrediction,
          edit.party,
          edit.prediction / 100,
        ),
      }
    }),
  )
  .subscribe(editPrediction)

function editPercent(
  initialPrediction: Record<PartyId, number>,
  partyId: PartyId,
  prediction: number,
): Record<PartyId, number> {
  const { [partyId]: targetInitialPrediction, ...rest } = initialPrediction
  const movableParties = rest as typeof initialPrediction

  const totalMovableParties = reduceRecord(movableParties, add)
  const targetDiff = prediction - targetInitialPrediction

  let given = 0
  const movablePredictions = mapRecord(movableParties, (initial) => {
    const result = Math.max(
      0,
      initial - (targetDiff * initial) / totalMovableParties,
    )
    given += initial - result
    return result
  })

  const result = {
    ...movablePredictions,
    [partyId]: targetInitialPrediction + given,
  }

  return result
}

function predictionToResult$(prediction$: Observable<Prediction>) {
  const predictedVotes$ = combineLatest([
    votesWithPartyVotes$,
    totalCounts$,
    prediction$,
  ]).pipe(
    map(([votes, counts, prediction]) =>
      mapRecord(
        votes,
        (provinceVotes, province): Votes => {
          const votesPending =
            counts[province].nVoters - counts[province].counted
          const totalVotes =
            provinceVotes.nil + provinceVotes.white + provinceVotes.partyVotes
          const nilPct = provinceVotes.nil / totalVotes
          const whitePct = provinceVotes.white / totalVotes
          const partyPct = 1 - nilPct - whitePct

          return {
            nil: provinceVotes.nil + Math.round(votesPending * nilPct),
            white: provinceVotes.white + Math.round(votesPending * whitePct),
            parties: mapRecord(
              provinceVotes.parties,
              (v, party) =>
                v +
                Math.round(
                  prediction[province][party] * votesPending * partyPct,
                ),
            ),
          }
        },
      ),
    ),
  )
  return createResultStreams(predictedVotes$)
}
