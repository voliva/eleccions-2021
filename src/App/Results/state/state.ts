import { participation$ } from "@/api/participation"
import { votes$ } from "@/api/votes"
import { add } from "@/utils/add"
import { mapRecord } from "@/utils/record-utils"
import { reduceRecord } from "@/utils/reduceRecord"
import { bind } from "@react-rxjs/core"
import { parties, PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { combineLatest } from "rxjs"
import { map, scan, startWith, switchMap } from "rxjs/operators"
import { selectedProvince$ } from "../AreaPicker"
import { isManipulatingBar$, PartyResults } from "./common"
import { getResultsByProvince } from "./results"

export const getCurrentResults = getResultsByProvince

export const [useCurrentResults, currentResults$] = bind(
  selectedProvince$.pipe(switchMap(getCurrentResults)),
)

const sortPartyResults = (a: PartyResults, b: PartyResults) =>
  b.sits - a.sits ||
  b.votes - a.votes ||
  parties[a.id].name.localeCompare(parties[b.id].name)
const actualOrder$ = currentResults$.pipe(
  map((res) =>
    Object.values(res.parties)
      .sort(sortPartyResults)
      .map((x) => x.id),
  ),
)

export const [useOrder, order$] = bind(
  combineLatest([isManipulatingBar$.pipe(startWith(false)), actualOrder$]).pipe(
    scan((acc, current) => {
      return current[0] ? acc : current
    }),
    map((x) => x[1]),
  ),
)

export const [usePartyResult, getPartyResult$] = bind((id: PartyId) =>
  currentResults$.pipe(map((res) => res.parties[id])),
)

const percents_$ = combineLatest([participation$, votes$]).pipe(
  map(([participation, votes]) => {
    let totalParticipation = 0
    let totalVoters = 0

    const participationPercents = mapRecord(participation, (x) => {
      const total = x.nVoters + x.nNonVoters
      totalParticipation += total
      totalVoters += x.nVoters
      return total && x.nVoters / total
    }) as Record<Provinces | "CAT", number>
    participationPercents.CAT = totalVoters && totalVoters / totalParticipation

    let totalCounted = 0
    const countedPercents = mapRecord(votes, (x, province) => {
      const total = x.nil + reduceRecord(x.parties, add, 0) + x.white
      totalCounted += total
      return total && total / participation[province].nVoters
    }) as Record<Provinces | "CAT", number>
    countedPercents.CAT = totalCounted && totalCounted / totalVoters

    return { participation: participationPercents, counted: countedPercents }
  }),
)

export const [usePercents, percents$] = bind(
  combineLatest([selectedProvince$, percents_$]).pipe(
    map(
      ([province, percents]) =>
        [
          percents.counted[province || "CAT"],
          percents.participation[province || "CAT"],
        ] as const,
    ),
  ),
)
