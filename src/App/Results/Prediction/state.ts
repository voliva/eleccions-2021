import { bind, shareLatest } from "@react-rxjs/core"
import {
  Participation,
  participation$ as realParticipation$,
} from "@/api/participation"
import { PartyId } from "@/api/parties"
import { Provinces, sitsByProvince } from "@/api/provinces"
import { Votes, votes$ } from "@/api/votes"
import {
  combineLatest,
  merge,
  MonoTypeOperatorFunction,
  Observable,
  ReplaySubject,
} from "rxjs"
import {
  filter,
  map,
  mergeAll,
  mergeMapTo,
  scan,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs/operators"
import { add } from "@/utils/add"
import { dhondt } from "@/utils/dhondt"
import {
  mapRecord,
  recordEntries,
  recordFromEntries,
  recordKeys,
} from "@/utils/record-utils"
import {
  mergeResults,
  predictionInput$,
  toggleLock$,
  editParty$,
  Results,
  reset$,
} from "../state/common"
import { selectedProvince$ } from "../AreaPicker"
import { mergeWithKey } from "@react-rxjs/utils"

const lastYearParticipation: Record<Provinces, Participation> = {
  BCN: {
    nVoters: 3296800,
    nNonVoters: 859509,
  },
  GIR: {
    nVoters: 409966,
    nNonVoters: 107919,
  },
  LLE: {
    nVoters: 242057,
    nNonVoters: 71861,
  },
  TAR: {
    nVoters: 242057,
    nNonVoters: 71861,
  },
}

const participation$ = realParticipation$.pipe(
  map((x) =>
    x.BCN.nVoters === 0 && x.BCN.nNonVoters === 0 ? lastYearParticipation : x,
  ),
)

const _predictions$ = new ReplaySubject<
  Record<Provinces, Record<PartyId, number>>
>(1)

const initialLocks: Record<Provinces, Set<PartyId>> = recordFromEntries(
  Object.values(Provinces).map((p) => [p, new Set<PartyId>()]),
)
const locks$: Observable<Record<Provinces, Set<PartyId>>> = mergeWithKey({
  update: toggleLock$,
  reset: reset$,
}).pipe(
  withLatestFrom(selectedProvince$, _predictions$.pipe(startWith({} as any))),
  scan((acc, [event, province, prevPredictions]) => {
    if (event.type === "reset") return initialLocks
    const partyId = event.payload
    if (province) {
      const nextSet = new Set(acc[province])
      if (nextSet.has(partyId)) nextSet.delete(partyId)
      else nextSet.add(partyId)
      return {
        ...acc,
        [province]: nextSet,
      }
    } else {
      return Object.values(acc).every((x) => x.has(partyId))
        ? mapRecord(acc, (x) => {
            const result = new Set(x)
            result.delete(partyId)
            return result
          })
        : mapRecord(acc, (x, province) => {
            const result = new Set(x)
            if (prevPredictions[province][partyId] !== undefined)
              result.add(partyId)
            return result
          })
    }
  }, initialLocks),
  startWith(initialLocks),
  shareLatest(),
)

export const [useIsLocked] = bind(
  (partyId: PartyId) =>
    combineLatest([locks$, selectedProvince$]).pipe(
      map(([l, province]) =>
        province
          ? l[province].has(partyId)
          : Object.values(l).every((x) => x.has(partyId))
          ? true
          : Object.values(l).some((x) => x.has(partyId))
          ? null
          : false,
      ),
    ),
  false,
)

export const multipliers$ = combineLatest([participation$, votes$]).pipe(
  map(([participation, votes]) => {
    let totalRemaining = 0

    const remainingVotesPerProvince = mapRecord(votes, (x, province) => {
      const totalVotes = x.nil + x.partyVotes + x.white
      const percentPartyVotes = totalVotes && x.partyVotes / totalVotes

      const expectedTotalParties = Math.round(
        participation[province].nVoters * percentPartyVotes,
      )
      const res = expectedTotalParties - x.partyVotes
      totalRemaining += res
      return res
    })

    if (totalRemaining === 0) {
      recordEntries(participation).forEach(([province, p]) => {
        totalRemaining += p.nVoters
        remainingVotesPerProvince[province] = p.nVoters
      })
    }

    const provinceToGeneral = (percent: number, province: Provinces) => {
      const votes = remainingVotesPerProvince[province] * (percent || 0)
      return votes / totalRemaining
    }

    const generalToProvinces = (
      percent: number,
      partyId: PartyId,
      latestPredictions: Record<Provinces, Record<PartyId, number>>,
    ) => {
      let total = 0
      const validEntries = recordEntries(latestPredictions).filter(
        (x) => x[1][partyId] !== undefined,
      )

      const weightsArr = validEntries.map(([province, value]) => {
        const res = provinceToGeneral(value[partyId], province)
        total += res
        return [province, res] as const
      })

      let totalExceeding = 0
      let nonExceedingTotalWeight = 0
      const nonExcceingEntries: Array<[Provinces, [number, number]]> = []
      const excceingEntries: Array<[Provinces, number]> = []
      const desiredResultsArr: Array<[Provinces, number]> = weightsArr.map(
        ([province, pWeight], idx) => {
          const proportion =
            total > 0 ? pWeight / total : validEntries.length / 1
          const percentProportion = proportion * percent
          const desired = percentProportion * totalRemaining

          if (desired > remainingVotesPerProvince[province]) {
            totalExceeding += desired - remainingVotesPerProvince[province]
            excceingEntries.push([province, 1])
          } else {
            nonExcceingEntries.push([province, [pWeight, idx]])
            nonExceedingTotalWeight += pWeight
          }
          return [province, desired]
        },
      )

      if (totalExceeding === 0) {
        return recordFromEntries(
          desiredResultsArr.map(([province, votesInProvince]) => [
            province,
            votesInProvince / remainingVotesPerProvince[province],
          ]),
        )
      }

      let newTotalExceeding = 0
      let totalAvailable = 0
      const newNonExcceingEntries: Array<[Provinces, number]> = []

      const newDesiredResultsArr: Array<
        [Provinces, number]
      > = nonExcceingEntries.map(([province, [pWeight, idx]], newIdx) => {
        const newDesired =
          totalExceeding * (pWeight / nonExceedingTotalWeight) +
          desiredResultsArr[idx][1]

        if (newDesired > remainingVotesPerProvince[province]) {
          newTotalExceeding += newDesired - remainingVotesPerProvince[province]
          excceingEntries.push([province, 1])
        } else {
          totalAvailable += remainingVotesPerProvince[province] - newDesired
          newNonExcceingEntries.push([province, newIdx])
        }
        return [province, newDesired]
      })

      if (newTotalExceeding === 0) {
        return recordFromEntries(
          newDesiredResultsArr
            .map(([province, votes]) => [
              province,
              votes / remainingVotesPerProvince[province],
            ])
            .concat(excceingEntries) as Array<[Provinces, number]>,
        )
      }

      return recordFromEntries(
        newNonExcceingEntries
          .map(([province, idx]) => {
            const available =
              remainingVotesPerProvince[province] - newDesiredResultsArr[idx][1]
            return [
              province,
              ((available / totalAvailable) * newTotalExceeding +
                newDesiredResultsArr[idx][1]) /
                remainingVotesPerProvince[province],
            ]
          })
          .concat(excceingEntries) as Array<[Provinces, number]>,
      )
    }

    const getPartyMaxGeneral = (partyId: PartyId): number => {
      const entries = recordEntries(votes)
      const filtered = entries.filter(
        (x) => x[1].parties[partyId] !== undefined,
      )
      return filtered.length === entries.length
        ? 1
        : filtered
            .map(
              ([province]) =>
                remainingVotesPerProvince[province] / totalRemaining,
            )
            .reduce(add)
    }

    return { generalToProvinces, provinceToGeneral, getPartyMaxGeneral }
  }),
  shareLatest(),
)

function getProvinceKeyValues(
  province: Provinces,
  locks: typeof locks$ extends Observable<infer T> ? T : never,
  prevPredictions: Record<Provinces, Record<PartyId, number>>,
  partyId: PartyId,
) {
  const prevValue = prevPredictions[province][partyId]

  const min = recordKeys(prevPredictions[province]).some(
    (x) => x !== partyId && !locks[province].has(x),
  )
    ? 0
    : prevValue

  const lockedValue = Array.from(locks[province])
    .filter((id) => id !== partyId)
    .map((pId) => prevPredictions[province][pId] || 0)
    .reduce(add, 0)

  return { prevValue, min, lockedValue }
}

const provinceSnapshot$ = editParty$.pipe(
  withLatestFrom(selectedProvince$, locks$, _predictions$),
  filter(([, province]) => !!province),
  map(([partyId, province, locks, prevPredictions]) => ({
    partyId,
    province,
    locks,
    ...getProvinceKeyValues(province!, locks, prevPredictions, partyId),
    prevPredictions,
  })),
  shareLatest(),
)

function getCatKeyValues(
  locks: typeof locks$ extends Observable<infer T> ? T : never,
  prevPredictions: Record<Provinces, Record<PartyId, number>>,
  partyId: PartyId,
  multipliers: typeof multipliers$ extends Observable<infer T> ? T : never,
) {
  const prevValue = recordEntries(prevPredictions)
    .map(([prov, percents]) =>
      multipliers.provinceToGeneral(percents[partyId], prov),
    )
    .reduce(add, 0)

  const min =
    prevValue -
    recordEntries(prevPredictions)
      .map(([prov, percents]) =>
        recordKeys(percents).some((x) => x !== partyId && !locks[prov].has(x))
          ? multipliers.provinceToGeneral(prevPredictions[prov][partyId], prov)
          : 0,
      )
      .reduce(add, 0)

  const lockedValue = recordEntries(locks)
    .map(([province, lock]) =>
      Array.from(lock)
        .filter((id) => id !== partyId)
        .map((id) =>
          multipliers.provinceToGeneral(
            prevPredictions[province][id],
            province,
          ),
        )
        .reduce(add, 0),
    )
    .reduce(add, 0)

  return { prevValue, min, lockedValue }
}

const catSnapshot$ = editParty$.pipe(
  withLatestFrom(selectedProvince$),
  switchMap(([partyId, province]) =>
    province
      ? []
      : combineLatest([
          multipliers$,
          locks$.pipe(withLatestFrom(_predictions$)),
        ]).pipe(
          map(([multipliers, [locks, prevPredictions]]) => ({
            partyId,
            multipliers,
            locks,
            prevPredictions,
            ...getCatKeyValues(locks, prevPredictions, partyId, multipliers),
            provincesKeyValues: mapRecord(prevPredictions, (_, province) =>
              getProvinceKeyValues(province, locks, prevPredictions, partyId),
            ),
          })),
        ),
  ),
  shareLatest(),
)

export const minMax$ = selectedProvince$.pipe(
  switchMap((province) => (province ? provinceSnapshot$ : catSnapshot$)),
  map((x) => ({ min: x.min, max: 1 - x.lockedValue })),
  shareLatest(),
)

const catPredictions$ = predictionInput$.pipe(
  withLatestFrom(selectedProvince$),
  filter(([value, province]) => !province && !Number.isNaN(value)),
  map((x) => Number(x[0]) / 100),
  withLatestFrom(catSnapshot$),
  map(
    ([
      desiredValue,
      {
        partyId,
        min,
        lockedValue,
        prevPredictions,
        locks,
        multipliers,
        provincesKeyValues,
      },
    ]) => {
      const max = 1 - lockedValue
      const value = Math.min(max, Math.max(min, desiredValue))

      const values = multipliers.generalToProvinces(
        value,
        partyId,
        prevPredictions,
      )

      return recordEntries(values).map(
        ([province, desiredValue]) =>
          [
            desiredValue,
            {
              ...provincesKeyValues[province],
              partyId,
              locks,
              province,
              prevPredictions,
            },
          ] as const,
      )
    },
  ),
  mergeAll(),
)

const provinceUpdates$ = predictionInput$.pipe(
  withLatestFrom(selectedProvince$),
  filter(([value, province]) => !!province && !Number.isNaN(value)),
  map((x) => Number(x[0]) / 100),
)
const provincePredictions$ = merge(
  provinceUpdates$.pipe(withLatestFrom(provinceSnapshot$)),
  catPredictions$,
).pipe(
  withLatestFrom(_predictions$),
  map(
    ([
      [
        desiredValue,
        {
          partyId,
          min,
          lockedValue,
          prevValue,
          locks,
          province,
          prevPredictions,
        },
      ],
      acc,
    ]) => {
      const max = 1 - lockedValue
      const value = Math.min(max, Math.max(min, desiredValue))

      if (value === prevValue) return acc

      const unlockedValue = 1 - lockedValue - prevValue
      const remaining = 1 - lockedValue - value

      if (unlockedValue > 0) {
        return {
          ...acc,
          [province!]: mapRecord(prevPredictions[province!], (val, party) =>
            party === partyId
              ? value
              : !locks[province!].has(party)
              ? (val / unlockedValue) * remaining
              : val,
          ),
        }
      }

      let nUnlocked = Object.keys(acc[province!]).length - locks[province!].size
      if (locks[province!].has(partyId)) nUnlocked--

      const splitValue = remaining / nUnlocked
      return {
        ...acc,
        [province!]: {
          ...mapRecord(prevPredictions[province!], (val, party) =>
            party === partyId
              ? value
              : !locks[province!].has(party)
              ? splitValue
              : val,
          ),
        },
      }
    },
  ),
  shareLatest(),
)

const connect = <T>() =>
  (tap(_predictions$) as any) as MonoTypeOperatorFunction<T>

const predictionFromVotes$ = votes$.pipe(
  map((results) =>
    mapRecord(results, (d) => {
      if (d.partyVotes > 0) return mapRecord(d.parties, (x) => x.partiesPercent)

      const percent = 1 / Object.keys(d.parties).length
      return mapRecord(d.parties, () => percent)
    }),
  ),
)

export const prediction$ = merge(
  provincePredictions$,
  predictionFromVotes$.pipe(takeUntil(provincePredictions$)),
  reset$.pipe(mergeMapTo(predictionFromVotes$.pipe(take(1)))),
).pipe(connect(), shareLatest())

const resultPerProvince = (
  _votes: Votes,
  prediction: Record<PartyId, number>,
  participation: Participation,
  nSits: number,
): Results => {
  let votes = _votes
  const totalEmittedVotes = votes.partyVotes + votes.nil + votes.white
  const validPercent =
    totalEmittedVotes > 0
      ? (totalEmittedVotes - votes.nil) / totalEmittedVotes
      : 1

  let remainingVotes = participation.nVoters - totalEmittedVotes
  if (remainingVotes === 0) {
    votes = { ...votes }
    votes.nil = 0
    votes.white = 0
    votes.partyVotes = 0
    votes.parties = mapRecord(votes.parties, (x) => ({
      ...x,
      votes: 0,
      percent: 0,
      partiesPercent: 0,
    }))
    remainingVotes = participation.nVoters
  }
  const remainingValid = Math.round(validPercent * remainingVotes)

  const totalValid = remainingValid + votes.partyVotes + votes.white

  let partyVotes = 0
  const parties = mapRecord(votes.parties, (x, partyId) => {
    const y = prediction[partyId]
    const votes = Math.round(x.votes + y * remainingValid)
    const percent = votes / totalValid
    partyVotes += votes
    return { ...x, votes, percent, sits: 0 }
  })

  const threshold = Math.round(totalValid * 0.03)
  const sits = dhondt(parties, nSits, threshold).map(([party]) => party)
  sits.forEach((party) => {
    parties[party as PartyId].sits++
  })

  const nil = participation.nVoters - totalValid
  const white = totalValid - partyVotes
  return {
    nil,
    white,
    partyVotes,
    parties,
    sits,
  }
}

const predictionResults$ = combineLatest([
  votes$,
  prediction$,
  participation$,
]).pipe(
  map(([pVotes, pPrediction, pParticipation]) =>
    mapRecord(pVotes, (votes, province) =>
      resultPerProvince(
        votes,
        pPrediction[province],
        pParticipation[province],
        sitsByProvince[province],
      ),
    ),
  ),
  shareLatest(),
)
predictionResults$.subscribe()

const catPredictionResults$ = predictionResults$.pipe(
  map(mergeResults),
  shareLatest(),
)
catPredictionResults$.subscribe()

export const getPredictionResultsByProvince = (province: Provinces | null) =>
  province
    ? predictionResults$.pipe(map((res) => res[province]))
    : catPredictionResults$
