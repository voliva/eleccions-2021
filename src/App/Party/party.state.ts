import { map } from "rxjs/operators"
import { bind } from "@react-rxjs/core"
import { PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { getCurrentResults } from "@/App/Results/state"

export const [
  usePartyResult,
  partyResult$,
] = bind((party: PartyId, province: Provinces | null) =>
  getCurrentResults(province).pipe(map((result) => result.parties[party])),
)
