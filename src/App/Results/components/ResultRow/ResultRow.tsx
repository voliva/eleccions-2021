import { PartyId } from "@/api/parties"
import { Subscribe } from "@react-rxjs/core"
import Prediction from "../../Prediction/Prediction"
import { Result, result$ } from "./Result"

export const ResultRow: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  return (
    <Subscribe source$={result$(partyId)}>
      <Result partyId={partyId} />
      <Prediction partyId={partyId} />
    </Subscribe>
  )
}
