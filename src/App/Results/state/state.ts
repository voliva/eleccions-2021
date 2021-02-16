import { bind } from "@react-rxjs/core"
import { PartyId } from "api/parties"
import { Provinces } from "api/provinces"
import { isResults$ } from "App/ResultsOrPrediction"
import { combineLatest, from } from "rxjs"
import { map, mergeMap, scan, startWith, switchMap } from "rxjs/operators"
import { selectedProvince$ } from "../AreaPicker"
import { getResultsByProvince } from "./results"
import { PartyResults, isManipulatingBar$ } from "./common"
import { deferredPrediction } from "../Prediction"
import { participation$ } from "api/participation"
import { votes$ } from "api/votes"
import { mapRecord } from "utils/record-utils"

const getPredictionResultsByProvince = (province: Provinces | null) =>
  from(deferredPrediction).pipe(
    mergeMap((x) => x.getPredictionResultsByProvince(province)),
  )

export const getCurrentResults = (province: Provinces | null) =>
  isResults$.pipe(
    switchMap((isResults) =>
      (isResults ? getResultsByProvince : getPredictionResultsByProvince)(
        province,
      ),
    ),
  )

export const [useCurrentResults, currentResults$] = bind(
  selectedProvince$.pipe(switchMap(getCurrentResults)),
)

const sortPartyResults = (a: PartyResults, b: PartyResults) =>
  b.sits - a.sits ||
  b.votes - a.votes ||
  a.party.name.localeCompare(b.party.name)
const actualOrder$ = currentResults$.pipe(
  map((res) =>
    Object.values(res.parties)
      .sort(sortPartyResults)
      .map((x) => x.party.id),
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
      const total = x.nil + x.partyVotes + x.white
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
