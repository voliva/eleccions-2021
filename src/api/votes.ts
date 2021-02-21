import { bind, shareLatest } from "@react-rxjs/core"
import { Observable } from "rxjs"
import { distinctUntilChanged, map } from "rxjs/operators"
import { mapRecord } from "@/utils/record-utils"
import { parties as partiesData, Party, PartyId } from "./parties"
import { Provinces } from "./provinces"
import { source$ } from "./source"
import { reduceRecord } from "@/utils/reduceRecord"

export interface Votes {
  nil: number
  white: number
  parties: Record<PartyId, number>
}

export const votes$: Observable<Record<Provinces, Votes>> = source$.pipe(
  distinctUntilChanged((a, b) => a.counts.timestamp === b.counts.timestamp),
  map(({ counts: { data } }) =>
    mapRecord(data, ({ blanks, nils, parties }) => ({
      nil: nils,
      white: blanks,
      parties,
    })),
  ),
  shareLatest(),
)

const globalVotes$ = votes$.pipe(
  map((votes) =>
    reduceRecord(
      votes,
      (acc, current): Votes => {
        if (acc === null) return current

        return {
          nil: acc.nil + current.nil,
          white: acc.white + current.white,
          parties: mapRecord(
            acc.parties,
            (v, party) => v + current.parties[party],
          ),
        }
      },
      (null as any) as Votes,
    ),
  ),
)

export const [useVotes, getVote$] = bind((province?: Provinces) =>
  province ? votes$.pipe(map((x) => x[province])) : globalVotes$,
)
