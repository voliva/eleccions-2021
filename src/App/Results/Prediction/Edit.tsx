import { PartyId } from "@/api/parties"
import {
  useIsEditingMe,
  onDoneEditing,
  onEditParty,
  useIsEditing,
} from "../state/common"

export const Edit: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  const isEditingMe = useIsEditingMe(partyId)
  const isVisible = useIsEditing()
  const onClick = isEditingMe ? onDoneEditing : () => onEditParty(partyId)

  return (
    <button
      className={`w-6 mx-2 text-main ${isVisible ? "" : "hidden"}`}
      onClick={onClick}
    >
      {isEditingMe ? <Check /> : <Pencil />}
    </button>
  )
}

const Pencil = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
)

const Check = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 15l7-7 7 7"
    />
  </svg>
)
