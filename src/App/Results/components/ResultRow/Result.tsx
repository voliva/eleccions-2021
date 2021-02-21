import { PartyId } from "@/api/parties"
import { bind } from "@react-rxjs/core"
import { map } from "rxjs/operators"
import { PartyResult } from "../../PartyResult"
import { currentResults$ } from "../../state"

export const [usePartyResult, partyResult$] = bind((id: PartyId) =>
  currentResults$.pipe(map((res) => res.parties[id])),
)

export const result$ = partyResult$
export const Result: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  const result = usePartyResult(partyId)
  return <PartyResult partyId={partyId} {...result} linkToParty />
}