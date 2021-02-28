import { bind } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { merge } from "rxjs"
import { switchMap } from "rxjs/operators"
import { commitedResult$, predictedResult$ } from "../../Prediction/state"
import { currentResults$ } from "../../state"

const [selectResults$, onSelectResults] = createListener(() => true)
const [selectPrediction$, onSelectPrediction] = createListener(() => false)

export const [useIsResults, isResults$] = bind(
  merge(selectResults$, selectPrediction$),
  true,
)

export const selectedResults$ = isResults$.pipe(
  switchMap((isResults) => (isResults ? currentResults$ : predictedResult$)),
)
export const selectedInitialResult$ = isResults$.pipe(
  switchMap((isResults) => (isResults ? currentResults$ : commitedResult$)),
)

export const ResultsOrPrediction: React.FC = () => {
  const isResults = useIsResults()
  return (
    <nav className="sticky top-0 bg-white z-50 flex justify-evenly text-lg border-b-2 border-gray-300 text-gray-500">
      <Tab isSelected={isResults} onClick={onSelectResults}>
        Resultats
      </Tab>
      <Tab isSelected={!isResults} onClick={onSelectPrediction}>
        Predicció
      </Tab>
    </nav>
  )
}

const Tab: React.FC<{ isSelected: boolean; onClick: () => void }> = ({
  children,
  isSelected,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`font-bold cursor-pointer pb-1 pt-2 px-5 border-b-3 -mb-0.5 border-transparent ${
      isSelected ? "text-green-700 border-main" : ""
    }`}
  >
    {children}
  </button>
)
