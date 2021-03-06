import { useState } from "react"
import { Flipper, Flipped } from "react-flip-toolkit"
import { parties, PartyId } from "@/api/parties"
import { useSelectedResults } from "../ResultsOrPrediction"

const SitsChart = () => {
  const results = useSelectedResults()
  const sits = results.sits || []

  const [sorting, setSorting] = useState<"party" | "dhondt">("party")
  const numSits = (() => {
    if (sorting === "dhondt") {
      const pCounts: Record<string, number> = {}
      return sits.map((p) => {
        pCounts[p] = pCounts[p] || 0
        return [p, p + "," + pCounts[p]++] as const
      })
    }
    const partySits = Object.entries(results.parties)
      .filter(([, p]) => p.sits >= 1)
      .map(([id, party]) => [id, party.sits] as const)
      .sort((a, b) => b[1] - a[1])
    const result: [string, string][] = []
    partySits.forEach(([party, sits]) => {
      for (let i = 0; i < sits; i++) {
        result.push([party, party + "," + i])
      }
    })
    return result
  })()

  return (
    <>
      <div className="text-center divide-x divide-white">
        <button
          className={`bg-gray-200 px-2 py-1 rounded-l-lg w-20 ${
            sorting === "party" ? "bg-gray-300" : null
          }`}
          onClick={() => setSorting("party")}
        >
          Partit
        </button>
        <button
          className={`bg-gray-200 px-2 py-1 rounded-r-lg w-20 ${
            sorting === "dhondt" ? "bg-gray-300" : null
          }`}
          onClick={() => setSorting("dhondt")}
        >
          D'Hondt
        </button>
      </div>
      <Flipper flipKey={sorting + ";" + sits.join(",")}>
        <div className="flex flex-wrap justify-center my-2">
          {numSits.map(([party, key]) => (
            <Flipped key={key} flipId={key}>
              <div
                className="p-3 rounded-lg border border-black m-0.5"
                style={{ backgroundColor: parties[party as PartyId].color }}
              ></div>
            </Flipped>
          ))}
        </div>
      </Flipper>
    </>
  )
}

export default SitsChart
