import { PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { Votes, votes$ } from "@/api/votes"
import { add } from "@/utils/add"
import {
  mapRecord,
  recordEntries,
  recordFromEntries,
} from "@/utils/record-utils"
import { reduceRecord } from "@/utils/reduceRecord"
import { bind, shareLatest } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { combineLatest, merge, Observable } from "rxjs"
import {
  map,
  mapTo,
  scan,
  startWith,
  switchMap,
  take,
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

const [predictionCommit$, commitPrediction] = createListener()
const [predictionReset$, resetPrediction] = createListener()
const commitedPrediction$ = merge(
  predictionCommit$.pipe(
    withLatestFrom(predictionEdit$),
    map(([_, p]) => p),
  ),
  predictionReset$.pipe(mapTo(null)),
).pipe(startWith(null), shareLatest())

export { commitPrediction, resetPrediction, predictionCommit$ }
export { editPartyPrediction, toggleLock }

const editedPrediction$ = merge(
  predictionEdit$,
  predictionCommit$.pipe(mapTo(null)),
).pipe(startWith(null), shareLatest())

export const [useIsPristine] = bind(
  commitedPrediction$.pipe(map((v) => !v)),
  true,
)

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
const [lockToggle$, toggleLock] = createListener<PartyId>()
const [partyPredictionEdit$, editPartyPrediction] = createListener<{
  party: PartyId
  prediction: number
}>()

export const lockedParties$ = lockToggle$.pipe(
  withLatestFrom(selectedProvince$),
  scan((locks, [party, province]) => {
    locks[party] = locks[party] || new Set<Provinces>()
    if (province === null) {
      const allProvinces = Object.keys(Provinces) as Provinces[]
      if (locks[party].size === allProvinces.length) {
        locks[party].clear()
      } else {
        allProvinces.forEach((province) => locks[party].add(province))
      }
      return locks
    }
    if (locks[party].has(province)) {
      locks[party].delete(province)
    } else {
      locks[party].add(province)
    }
    return locks
  }, {} as Record<PartyId, Set<Provinces>>),
  startWith({} as Record<PartyId, Set<Provinces>>),
  shareLatest(),
)

partyPredictionEdit$
  .pipe(
    withLatestFrom(selectedProvince$),
    switchMap(([edit, province]) => {
      if (province === null) {
        return handleGlobalPredictionEdit(edit)
      }
      return handleProvincePredictionEdit(edit, province)
    }),
  )
  .subscribe(editPrediction)

function handleProvincePredictionEdit(
  edit: { party: PartyId; prediction: number },
  province: Provinces,
): Observable<Prediction> {
  return combineLatest([initialPrediction$, lockedParties$]).pipe(
    take(1),
    map(([initialPrediction, locks]) => {
      const { [province]: targetInitialPrediction, ...rest } = initialPrediction
      const restProvinces = rest as Prediction
      const lockedParties = recordEntries(locks)
        .filter(([_, provinces]) => provinces.has(province))
        .map(([party]) => party)

      return {
        ...restProvinces,
        [province!]: editPercent(
          targetInitialPrediction,
          edit.party,
          edit.prediction,
          lockedParties,
        ),
      }
    }),
  )
}

function editPercent(
  initialPrediction: Record<PartyId, number>,
  partyId: PartyId,
  prediction: number,
  locks: PartyId[],
): Record<PartyId, number> {
  const { [partyId]: targetInitialPrediction = 0, ...rest } = initialPrediction
  const movableParties = recordFromEntries(
    recordEntries(rest as typeof initialPrediction).filter(
      ([partyId]) => !locks.includes(partyId),
    ),
  )
  const nMovableParties = Object.keys(movableParties).length

  const totalMovableParties = reduceRecord(movableParties, add)
  const targetDiff = prediction - targetInitialPrediction

  let given = 0
  const movablePredictions = mapRecord(movableParties, (initial) => {
    const result = Math.max(
      0,
      initial -
        (totalMovableParties === 0
          ? 0
          : (targetDiff * (initial + Number.EPSILON)) / // We're adding e so that if they're all 0 they still receive some value
            (totalMovableParties + nMovableParties * Number.EPSILON)),
    )
    given += initial - result
    return result
  })

  const result = {
    ...rest,
    ...movablePredictions,
    [partyId]: targetInitialPrediction + given,
  }

  return result
}

function handleGlobalPredictionEdit(edit: {
  party: PartyId
  prediction: number
}): Observable<Prediction> {
  return combineLatest([
    initialPrediction$,
    lockedParties$,
    totalCounts$,
    votesWithPartyVotes$,
  ]).pipe(
    take(1),
    map(([initialPrediction, locks, counts, votes]) => {
      const initialPredictedVotes = getPredictedVotes(
        votes,
        counts,
        initialPrediction,
      )
      const initialGlobalVotes = reduceRecord(
        initialPredictedVotes,
        (total, pred) => total + (pred.parties[edit.party] || 0),
        0,
      )
      const toCount = mapRecord(
        counts,
        (count, province) =>
          (count.nVoters - count.counted) *
          (votes[province].partyVotes / count.counted),
      )

      // Calculate the number of votes needed to reach edit.prediction
      const totalToCount = reduceRecord(toCount, add)
      const realVotes = reduceRecord(
        votes,
        (total, v) => total + (v.parties[edit.party] || 0),
        0,
      )
      const targetVotes = realVotes + totalToCount * edit.prediction
      const deltaVotes = targetVotes - initialGlobalVotes

      // 2. Calculate margin for each province: i.e. how much votes can it raise? How much votes can it decrease?
      const locksByProvince = recordEntries(locks)
        .map(([party, lockedProvinces]) =>
          Array.from(lockedProvinces).map(
            (province) => [province, party] as const,
          ),
        )
        .flat()
        .reduce((acc, [province, party]) => {
          acc[province] = acc[province] || new Set()
          acc[province].add(party)
          return acc
        }, {} as Record<Provinces, Set<PartyId>>)
      const margins = mapRecord(
        initialPredictedVotes,
        (provinceVotes, province) => {
          const provinceLocks = locksByProvince[province] || new Set()

          // If that party has a lock on that province, that province is not movable.
          if (provinceLocks.has(edit.party)) return 0

          // If that party is not present on that province, that province is not movable
          if (!(edit.party in votes[province].parties)) return 0

          if (deltaVotes < 0) {
            // Other parties receive: This will be either 0 (all other parties locked)
            // or edit.party's extra votes (all votes it can give away on that province)
            if (
              Object.keys(provinceVotes.parties).every((party) =>
                provinceLocks.has(party as PartyId),
              )
            )
              return 0
            return provinceVotes.addedVotes[edit.party] || 0
          }

          // Other parties need to give: count the amount of votes other parties are willing to give
          return recordEntries(provinceVotes.addedVotes)
            .map(([party, votes]) => {
              if (provinceLocks.has(party) || party === edit.party) {
                return 0
              }
              return votes
            })
            .reduce(add)
        },
      )

      // Apply deltaVotes proportionally on all provinces, by using the margin ratio
      const totalMargins = reduceRecord(margins, add)

      if (totalMargins === 0) {
        return initialPrediction
      }

      return mapRecord(margins, (margin, province) => {
        const votesReceived = (deltaVotes * margin) / totalMargins
        const targetAddedVotes = Math.max(
          0,
          (initialPredictedVotes[province].addedVotes[edit.party] || 0) +
            votesReceived,
        )
        const remainingPartyVotes = toCount[province]

        return editPercent(
          initialPrediction[province],
          edit.party,
          Math.max(0, Math.min(1, targetAddedVotes / remainingPartyVotes)),
          locksByProvince[province]
            ? Array.from(locksByProvince[province])
            : [],
        )
      })
    }),
  )
}

function predictionToResult$(prediction$: Observable<Prediction>) {
  const predictedVotes$ = combineLatest([
    votesWithPartyVotes$,
    totalCounts$,
    prediction$,
  ]).pipe(
    map(([votes, counts, prediction]) =>
      getPredictedVotes(votes, counts, prediction),
    ),
  )
  return createResultStreams(predictedVotes$)
}

function getPredictedVotes(
  realVotes: Record<Provinces, Votes & { partyVotes: number }>,
  counts: Record<
    Provinces,
    { nVoters: number; census: number; counted: number }
  >,
  prediction: Prediction,
) {
  return mapRecord(realVotes, (provinceVotes, province) => {
    const votesPending = counts[province].nVoters - counts[province].counted
    const totalVotes =
      provinceVotes.nil + provinceVotes.white + provinceVotes.partyVotes
    const nilPct = provinceVotes.nil / totalVotes
    const whitePct = provinceVotes.white / totalVotes
    const partyPct = 1 - nilPct - whitePct

    const addedVotes = mapRecord(prediction[province], (pred) =>
      Math.round(pred * votesPending * partyPct),
    )

    return {
      nil: provinceVotes.nil + Math.round(votesPending * nilPct),
      white: provinceVotes.white + Math.round(votesPending * whitePct),
      parties: mapRecord(
        provinceVotes.parties,
        (v, party) => v + addedVotes[party],
      ),
      addedVotes,
    }
  })
}
