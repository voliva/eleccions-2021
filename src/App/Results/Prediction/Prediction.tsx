import { PartyId } from "@/api/parties"
import { Edit } from "./Edit"
import Form from "./Form"
import { Lock } from "./Lock"

const Prediction: React.FC<{ partyId: PartyId }> = ({ partyId }) => (
  <>
    <Edit partyId={partyId} />
    <Lock partyId={partyId} />
    <Form partyId={partyId} />
  </>
)

export default Prediction
