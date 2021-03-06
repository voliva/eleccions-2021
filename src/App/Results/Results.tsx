import { parties } from "@/api/parties"
import { bind, Subscribe } from "@react-rxjs/core"
import { Flipped, Flipper } from "react-flip-toolkit"
import { merge } from "rxjs"
import { map } from "rxjs/operators"
import { AreaPicker } from "./components/AreaPicker"
import { ResultRow } from "./components/ResultRow"
import { ResultsChart, resultsChart$ } from "./components/ResultsChart"
import {
  ResultsOrPrediction,
  selectedInitialResult$,
  useIsResults,
} from "./components/ResultsOrPrediction"
import { resetPrediction, useIsPristine } from "./Prediction/state"
import { PartyResults } from "./state/results"

const sortPartyResults = (a: PartyResults, b: PartyResults) =>
  b.sits - a.sits ||
  b.votes - a.votes ||
  parties[a.id].name.localeCompare(parties[b.id].name)

export const [useOrder, order$] = bind(
  selectedInitialResult$.pipe(
    map((res) =>
      Object.values(res.parties)
        .sort(sortPartyResults)
        .map((x) => x.id),
    ),
  ),
)

const Parties: React.FC = () => {
  const partyIds = useOrder()
  return (
    <Flipper flipKey={partyIds.join()}>
      <ul>
        {partyIds.map((partyId) => (
          <Flipped key={partyId} flipId={partyId} translate>
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
        onClick={resetPrediction}
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
      <ResultsOrPrediction />
      <AreaPicker />
      <main>
        <ResultsChart />
        <Reset />
        <Parties />
      </main>
    </Subscribe>
  )
}
