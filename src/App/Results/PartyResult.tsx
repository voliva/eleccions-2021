import { Party, PartyId } from "@/api/parties"
import { formatNumber, formatPercent } from "@/utils/formatters"
import { Link } from "react-router-dom"
import { getTextColor } from "@/utils/color"
import { ProgressBar } from "@/components/progressBar"

export const PartyResult: React.FC<{
  party: Party
  sits: number
  votes: number
  percent: number
  linkToParty?: boolean
  onClickMiddle?: (party: PartyId) => void
}> = ({ party, sits, votes, percent, linkToParty, onClickMiddle }) => {
  const sitsElementProps = {
    className: `flex-grow-0 text-center ${getTextColor(
      party.color,
    )} h-12 w-12 rounded-full font-bold text-xl flex`,
    style: { backgroundColor: party.color },
    children: <span className="m-auto">{sits}</span>,
  }

  const sitsElement = linkToParty ? (
    <Link {...sitsElementProps} to={`/party/${party.id}`} />
  ) : (
    <div {...sitsElementProps} />
  )
  return (
    <div className="flex-grow flex items-center">
      {sitsElement}
      <div
        className={`flex-grow flex flex-col h-14 justify-between${
          onClickMiddle ? " cursor-pointer" : ""
        }`}
        onClick={() => onClickMiddle?.(party.id)}
      >
        <div
          className="pl-2 pb-1.5 text-lg -mb-2 -mt-1 antialiased font-medium flex-grow-0 truncate overflow-hidden"
          style={{ maxWidth: "225px" }}
        >
          {party.name}
        </div>
        <ProgressBar
          className="border-l-0 rounded-r-md -ml-0.5 flex-grow-0"
          width={Math.max(0.4, percent * 100)}
          color={party.color}
        />
        <div className="pl-2 mt-1 -mb-1 pb-1 flex justify-between text-sm text-gray-600 flex-grow-0 ">
          <span className="">{formatNumber(votes)} vots</span>
          <span className="">{formatPercent(percent)}</span>
        </div>
      </div>
    </div>
  )
}
