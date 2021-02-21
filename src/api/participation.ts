import { bind, shareLatest } from "@react-rxjs/core"
import { Observable } from "rxjs"
import { distinctUntilChanged, map } from "rxjs/operators"
import { mapRecord } from "@/utils/record-utils"
import { Provinces } from "./provinces"
import { source$ } from "./source"
import { reduceRecord } from "@/utils/reduceRecord"

export interface Participation {
  nVoters: number
  nNonVoters: number
}

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
const globalParticipation$ = participation$.pipe(
  map((participation) =>
    reduceRecord(
      participation,
      (acc, current) => {
        acc.nNonVoters += current.nNonVoters
        acc.nVoters += current.nVoters
        return acc
      },
      { nVoters: 0, nNonVoters: 0 },
    ),
  ),
)

export const [
  useParticipation,
  getParticipation$,
] = bind((province?: Provinces) =>
  province
    ? participation$.pipe(map((x) => x[province]))
    : globalParticipation$,
)
