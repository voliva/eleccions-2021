import { PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { votes$ } from "@/api/votes"
import { createResultStreams } from "@/App/Results/state/results"
import { bind } from "@react-rxjs/core"
import { map } from "rxjs/operators"

const { getResults$ } = createResultStreams(votes$)

export const [
  usePartyResult,
  partyResult$,
] = bind((party: PartyId, province: Provinces | null) =>
  getResults$(province).pipe(map((result) => result.parties[party])),
)
