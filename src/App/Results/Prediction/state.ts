import { votes$ } from "@/api/votes"
import { add } from "@/utils/add"
import { bind, shareLatest } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { PartyId } from "api/parties"
import { Provinces } from "api/provinces"
import { combineLatest, merge } from "rxjs"
import { map, mapTo, startWith, switchMap } from "rxjs/operators"
import { mapRecord } from "utils/record-utils"
import { reduceRecord } from "utils/reduceRecord"
import { selectedProvince$ } from "../components/AreaPicker"
import { createResultStreams, totalCounts$ } from "../state/results"
import { results$ } from "../state/state"

type Prediction = Record<Provinces, Record<PartyId, number>>

const automaticPrediction$ = results$.pipe(
  map(
    (provinces): Prediction =>
      mapRecord(provinces, (results) => {
        const partyVotes = reduceRecord(
          results.parties,
          (acc, party) => acc + party.votes,
          0,
        )
        const validVotes = partyVotes + results.white

        return mapRecord(results.parties, ({ votes }) => votes / validVotes)
      }),
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
]).pipe(
  map(([prediction, counts]) => {
    const toCount = mapRecord(
      counts,
      ({ nVoters, counted }) => nVoters - counted,
    )
    const votesPredicted = mapRecord(
      prediction,
      (provincePrediction, province) =>
        mapRecord(provincePrediction, (p) => toCount[province] * p),
    )
    const globalVotesPredicted = reduceRecord(votesPredicted, (acc, votes) =>
      mapRecord(acc, (v, party) => v + votes[party]),
    )
    const totalVotesPredicted = reduceRecord(globalVotesPredicted, add)

    return mapRecord(
      globalVotesPredicted,
      (votes) => votes / totalVotesPredicted,
    )
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
  votes$,
  totalCounts$,
  visiblePrediction$,
]).pipe(
  map(([votes, counts, prediction]) =>
    mapRecord(votes, (provinceVotes, province) => {
      const votesPending = counts[province].nVoters - counts[province].nVoters
      return {
        ...provinceVotes,
        parties: mapRecord(
          provinceVotes.parties,
          (v, party) => v + prediction[province][party] * votesPending,
        ),
      }
    }),
  ),
)

const { getResults$: visiblePredictedResult$ } = createResultStreams(
  visiblePredictionVotes$,
)

export const [usePartyPredictedResult, partyPredictedResult$] = bind(
  (party: PartyId) =>
    selectedProvince$.pipe(
      switchMap(visiblePredictedResult$),
      map((results) => results.parties[party]),
    ),
)

// Editing
const [partyPredictionEdit$, editPartyPrediction] = createListener<{
  party: PartyId
  province: Provinces | null
}>()
const [commitEdit$, commitEdit] = createListener()
const [resetEdit$, resetEdit] = createListener()

export { editPartyPrediction, commitEdit, resetEdit }
