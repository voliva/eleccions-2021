import { PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { Votes, votes$ } from "@/api/votes"
import { add } from "@/utils/add"
import { mapRecord } from "@/utils/record-utils"
import { reduceRecord } from "@/utils/reduceRecord"
import { bind, shareLatest } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { combineLatest, merge } from "rxjs"
import { map, mapTo, startWith, switchMap } from "rxjs/operators"
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

const [predictionCommit$, commitPrediction] = createListener<Prediction>()
const [predictionReset$, resetPrediction] = createListener()
const commitedPrediction$ = merge(
  predictionCommit$,
  predictionReset$.pipe(mapTo(null)),
).pipe(startWith(null), shareLatest())

// Used as a baseline for editing, so the same value always yields the same result
const initialPrediction$ = combineLatest([
  automaticPrediction$,
  commitedPrediction$,
]).pipe(map(([automatic, commited]) => commited || automatic))

const [predictionEdit$, editPrediction] = createListener<Prediction>()
const editedPrediction$ = predictionEdit$.pipe(startWith(null), shareLatest())

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
const visiblePredictionVotes$ = combineLatest([
  votesWithPartyVotes$,
  totalCounts$,
  visiblePrediction$,
]).pipe(
  map(([votes, counts, prediction]) =>
    mapRecord(
      votes,
      (provinceVotes, province): Votes => {
        const votesPending = counts[province].nVoters - counts[province].counted
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
              Math.round(prediction[province][party] * votesPending * partyPct),
          ),
        }
      },
    ),
  ),
)

const { getResults$: visiblePredictedResult$ } = createResultStreams(
  visiblePredictionVotes$,
)

export const predictedResult$ = selectedProvince$.pipe(
  switchMap(visiblePredictedResult$),
  shareLatest(),
)

// Editing
const [partyPredictionEdit$, editPartyPrediction] = createListener<{
  party: PartyId
  prediction: number
}>()
const [commitEdit$, commitEdit] = createListener()
const [resetEdit$, resetEdit] = createListener()

export { editPartyPrediction, commitEdit, resetEdit }
