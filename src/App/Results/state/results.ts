import { map } from "rxjs/operators"
import { mapRecord } from "@/utils/record-utils"
import { PartyId } from "@/api/parties"
import { Provinces, sitsByProvince } from "@/api/provinces"
import { Votes, votes$ } from "@/api/votes"
import { dhondt } from "@/utils/dhondt"
import { shareLatest } from "@react-rxjs/core"
import { mergeResults, Results } from "./common"
import { reduceRecord } from "@/utils/reduceRecord"

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

const results$ = votes$.pipe(
  map((votes) => mapRecord(votes, getProvinceResults)),
  shareLatest(),
)
results$.subscribe()

const catResults$ = results$.pipe(map(mergeResults), shareLatest())
catResults$.subscribe()

export const getResultsByProvince = (province: Provinces | null) =>
  province ? results$.pipe(map((res) => res[province])) : catResults$
