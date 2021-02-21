import { bind, shareLatest } from "@react-rxjs/core"
import { Observable } from "rxjs"
import { distinctUntilChanged, map } from "rxjs/operators"
import { mapRecord } from "@/utils/record-utils"
import { Provinces } from "./provinces"
import { source$ } from "./source"

export interface Participation {
  nVoters: number
  nNonVoters: number
}

/* for simulating 100% count:
 votes$.pipe(
  map((votes) =>
    mapRecord(votes, (x) => {
      const nVoters = x.nil + x.white + x.partyVotes
      return { nVoters, nNonVoters: nVoters * 0.5 }
    }),
  ),
  shareLatest(),
)
 */
export const participation$: Observable<
  Record<Provinces, Participation>
> = source$.pipe(
  distinctUntilChanged(
    (a, b) => a.participation.timestamp === b.participation.timestamp,
  ),
  map(({ participation }) =>
    mapRecord(participation.data, (result) => ({
      nVoters: Number(result.turnout),
      nNonVoters: Number(result.abstention),
    })),
  ),
  shareLatest(),
)

export const [useParticipation, getParticipation$] = bind(
  (province?: Provinces) =>
    participation$.pipe(
      province
        ? map((x) => x[province])
        : map((data) =>
            Object.values(data).reduce(
              (acc, current) => {
                acc.nNonVoters += current.nNonVoters
                acc.nVoters += current.nVoters
                return acc
              },
              { nVoters: 0, nNonVoters: 0 },
            ),
          ),
    ),
)
