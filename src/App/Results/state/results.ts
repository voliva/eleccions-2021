import { map } from "rxjs/operators"
import { mapRecord } from "utils/record-utils"
import { PartyId } from "api/parties"
import { Provinces, sitsByProvince } from "api/provinces"
import { Votes, votes$ } from "api/votes"
import { dhondt } from "utils/dhondt"
import { shareLatest } from "@react-rxjs/core"
import { mergeResults, Results } from "./common"

const getProvinceResults = (votes: Votes, province: Provinces): Results => {
  const validVotes = votes.white + votes.partyVotes

  const nSits = sitsByProvince[province]
  const threshold = Math.round(validVotes * 0.03)

  const parties = mapRecord(votes.parties, (x) => ({ ...x, sits: 0 }))
  let sits: string[] = []
  if (validVotes) {
    sits = dhondt(parties, nSits, threshold).map(([party]) => party)
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
