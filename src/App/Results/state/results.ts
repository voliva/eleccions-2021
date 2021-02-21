import { map } from "rxjs/operators"
import { mapRecord, recordEntries } from "@/utils/record-utils"
import { PartyId } from "@/api/parties"
import { Provinces, sitsByProvince } from "@/api/provinces"
import { Votes, votes$ } from "@/api/votes"
import { dhondt } from "@/utils/dhondt"
import { shareLatest } from "@react-rxjs/core"
import { reduceRecord } from "@/utils/reduceRecord"
import { add } from "@/utils/add"
import { combineLatest, Observable } from "rxjs"
import { participation$ } from "@/api/participation"

export interface PartyResults {
  id: PartyId
  votes: number
  percent: number
  sits: number
}

export interface Results {
  nil: number
  white: number
  parties: Record<PartyId, PartyResults>
  sits: string[]
}

const getProvinceResults = (votes: Votes, province: Provinces): Results => {
  const validVotes =
    votes.white + reduceRecord(votes.parties, (acc, v) => acc + v, 0)

  const nSits = sitsByProvince[province]
  const threshold = Math.round(validVotes * 0.03)

  const parties = mapRecord(votes.parties, (votes, id) => ({
    votes,
    percent: votes / validVotes,
    sits: 0,
    id,
  }))
  let sits: string[] = []
  if (validVotes) {
    sits = dhondt(votes.parties, nSits, threshold).map(([party]) => party)
    sits.forEach((party) => {
      parties[party as PartyId].sits++
    })
  }

  return {
    ...votes,
    parties,
    sits,
  }
}

const mergeResults = (results: Record<Provinces, Results>) => {
  const result = reduceRecord(
    results,
    (acc, current) => {
      acc.nil += current.nil
      acc.white += current.white
      recordEntries(current.parties).forEach(([partyId, { votes, sits }]) => {
        if (!acc.parties[partyId]) {
          acc.parties[partyId] = { id: partyId, votes, sits, percent: 0 }
        } else {
          acc.parties[partyId].sits += sits
          acc.parties[partyId].votes += votes
        }
      })
      return acc
    },
    { nil: 0, white: 0, parties: {} } as Results,
  )

  const validVotes =
    result.white +
    Object.values(result.parties)
      .map((party) => party.votes)
      .reduce(add)

  Object.values(result.parties).forEach((party) => {
    party.percent = validVotes && party.votes / validVotes
  })

  return result
}

export const createResultStreams = (
  votes$: Observable<Record<Provinces, Votes>>,
) => {
  const results$ = votes$.pipe(
    map((votes) => mapRecord(votes, getProvinceResults)),
    shareLatest(),
  )

  const globalResults$ = results$.pipe(map(mergeResults), shareLatest())

  return {
    results$,
    globalResults$,
    getResults$: (province?: Provinces | null) =>
      province ? results$.pipe(map((v) => v[province])) : globalResults$,
  }
}

export const totalCounts$ = combineLatest([participation$, votes$]).pipe(
  map(([participation, votes]) =>
    mapRecord(participation, ({ nVoters, nNonVoters }, province) => {
      const provinceVotes = votes[province]

      return {
        nVoters,
        census: nVoters + nNonVoters,
        counted:
          provinceVotes.nil +
          reduceRecord(provinceVotes.parties, add, 0) +
          provinceVotes.white,
      }
    }),
  ),
)

export const percent$ = totalCounts$.pipe(
  map((counts) =>
    mapRecord(counts, ({ nVoters, census, counted }) => ({
      participation: nVoters / census,
      counted: counted / nVoters,
    })),
  ),
)

export const globalPercent$ = totalCounts$.pipe(
  map((counts) => {
    const { nVoters, census, counted } = reduceRecord(
      counts,
      (acc, counts) => ({
        census: acc.census + counts.census,
        counted: acc.counted + counts.counted,
        nVoters: acc.nVoters + counts.nVoters,
      }),
      {
        census: 0,
        counted: 0,
        nVoters: 0,
      },
    )
    return {
      participation: nVoters / census,
      counted: counted / nVoters,
    }
  }),
)
