import { Subscribe } from "@react-rxjs/core"
import { useIsResults } from "App/ResultsOrPrediction"
import { Flipper, Flipped } from "react-flip-toolkit"
import { merge } from "rxjs"
import { AreaPicker } from "./AreaPicker"
import { ResultRow } from "./ResultRow"
import { ResultsChart, resultsChart$ } from "./ResultsChart"
import { useOrder, order$ } from "./state"
import { onReset, useIsPristine } from "./state/common"

const Parties: React.FC = () => {
  const partyIds = useOrder()
  return (
    <Flipper flipKey={partyIds.join()}>
      <ul>
        {partyIds.map((partyId) => (
          <Flipped key={partyId} flipId={partyId}>
            <li
              className={
                "flex flex-wrap items-center p-3 mx-1 my-1.5 border-gray-300 border rounded-md bg-white"
              }
            >
              <ResultRow partyId={partyId} />
            </li>
          </Flipped>
        ))}
      </ul>
    </Flipper>
  )
}

const Reset: React.FC = () => {
  const isResults = useIsResults()
  const isPristine = useIsPristine()
  return isPristine || isResults ? null : (
    <div className="text-right pr-1.5">
      <button
        className="border-2 border-green-700 text-green-700 rounded-md px-2 py-1 text-sm"
        onClick={onReset}
      >
        Neteja les prediccions
      </button>
    </div>
  )
}

const $results = merge(order$, resultsChart$)
export const Results: React.FC = () => {
  return (
    <Subscribe source$={$results}>
      <AreaPicker />
      <main>
        <ResultsChart />
        <Reset />
        <Parties />
      </main>
    </Subscribe>
  )
}
