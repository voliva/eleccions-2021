import { shareLatest } from "@react-rxjs/core"
import { Observable } from "rxjs"
import { distinctUntilChanged, map } from "rxjs/operators"
import { mapRecord } from "@/utils/record-utils"
import { parties as partiesData, Party, PartyId } from "./parties"
import { Provinces } from "./provinces"
import { source$ } from "./source"

export interface Votes {
  nil: number
  white: number
  partyVotes: number
  parties: Record<
    PartyId,
    { party: Party; votes: number; percent: number; partiesPercent: number }
  >
}

export const votes$: Observable<Record<Provinces, Votes>> = source$.pipe(
  distinctUntilChanged((a, b) => a.counts.timestamp === b.counts.timestamp),
  map(({ counts: { data } }) => {
    const result = mapRecord(data, (provinceCount) => {
      let partyVotes: number = 0
      const parties = mapRecord(provinceCount.parties, (votes, partyId) => {
        partyVotes += votes
        return {
          party: partiesData[partyId],
          votes,
          percent: 0,
          partiesPercent: 0,
        }
      })

      const white = provinceCount.blanks
      const validVotes = white + partyVotes
      Object.values(parties).forEach((v) => {
        v.percent = v.votes / validVotes
        v.partiesPercent = v.votes / partyVotes
      })
      return {
        nil: provinceCount.nils,
        white,
        partyVotes,
        parties,
      }
    })
    return Object.values(result).some((v) => v.partyVotes === 0)
      ? mapRecord(result, ({ parties }) => ({
          nil: 0,
          white: 0,
          partyVotes: 0,
          parties: mapRecord(parties, (x) => ({
            party: x.party,
            votes: 0,
            percent: 0,
            partiesPercent: 0,
          })),
        }))
      : result
  }),
  shareLatest(),
)
