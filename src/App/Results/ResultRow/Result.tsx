import { PartyId } from "@/api/parties"
import { PartyResult } from "../PartyResult"
import { usePartyResult, getPartyResult$ } from "../state"
import { useIsEditing, onEditParty } from "../state/common"

export const result$ = getPartyResult$
export const Result: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  const result = usePartyResult(partyId)
  const onClick = useIsEditing() ? onEditParty : undefined
  return <PartyResult onClickMiddle={onClick} {...result} linkToParty />
}
