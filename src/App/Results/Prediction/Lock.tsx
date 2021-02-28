import { PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { bind } from "@react-rxjs/core"
import { combineLatest } from "rxjs"
import { map } from "rxjs/operators"
import { selectedProvince$ } from "../components/AreaPicker"
import { useIsResults } from "../components/ResultsOrPrediction"
import { lockedParties$, toggleLock } from "./state"

const [useIsLocked] = bind(
  (partyId: PartyId) =>
    combineLatest([lockedParties$, selectedProvince$]).pipe(
      map(([locks, province]) => {
        const provinceLocks = locks[partyId] || new Set()
        if (province === null) {
          return provinceLocks.size === 0
            ? false
            : provinceLocks.size === Object.keys(Provinces).length
            ? true
            : null
        }
        return provinceLocks.has(province)
      }),
    ),
  false,
)

export const Lock: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  const isVisible = !useIsResults()
  const isLocked = useIsLocked(partyId)
  return (
    <button
      onClick={() => toggleLock(partyId)}
      className={`w-6 ${
        isLocked
          ? "text-red-800"
          : isLocked === null
          ? "text-yellow-600"
          : "text-green-600"
      } ${isVisible ? "" : "hidden"}`}
    >
      {isLocked ? <LockClosed /> : <LockOpen />}
    </button>
  )
}

const LockOpen = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
  </svg>
)

const LockClosed = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
      clipRule="evenodd"
    />
  </svg>
)
