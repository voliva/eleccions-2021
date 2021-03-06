import { parties } from "@/api/parties"
import { sitsByProvince, totalSits } from "@/api/provinces"
import { recordEntries, recordFromEntries } from "@/utils/record-utils"
import { bind } from "@react-rxjs/core"
import { FC, lazy, Suspense, useState } from "react"
import { map, switchMap } from "rxjs/operators"
import { selectedProvince$, useSelectedProvince } from "../AreaPicker"
import { globalPercent$, percent$ } from "../../state/results"
import { GradientChart } from "./gradientChart"
import { HalfDonut } from "./halfDonut"
import { LineChart } from "./lineChart"
import { selectedResults$ } from "../ResultsOrPrediction"
import { merge } from "rxjs"

const sitsChartPromise = import("./flipSitsChart")
const SitsChart = lazy(() => sitsChartPromise)

const [usePercents, percents$] = bind(
  selectedProvince$.pipe(
    switchMap((province) =>
      province ? percent$.pipe(map((v) => v[province])) : globalPercent$,
    ),
    map(({ counted, participation }) => [counted, participation]),
  ),
)

const [useCurrentResults, currentResults$] = bind(selectedResults$)
export const resultsChart$ = merge(percents$, currentResults$)
export const ResultsChart = () => {
  const [counted, participation] = usePercents().map((x) =>
    (x * 100).toFixed(2),
  )
  return (
    <div className="p-3 mx-1 my-1.5 border-gray-300 border rounded-md bg-white">
      <div className="flex">
        <div className="flex-grow font-bold">{counted}% escrutat</div>
        <div className="flex-grow text-right">
          {participation}% participació
        </div>
      </div>
      <Chart counted={counted}>
        <DetailView />
      </Chart>
    </div>
  )
}

const Chart: FC<{ counted: string }> = ({ counted, children }) => {
  const results = useCurrentResults()
  const [expanded, setExpanded] = useState(false)
  const isProvince = Boolean(useSelectedProvince())

  const totalVotes =
    results.nil +
    results.white +
    Object.values(results.parties).reduce((t, p) => t + p.votes, 0)
  const blankPct =
    totalVotes > 0 ? ((results.white / totalVotes) * 100).toFixed(2) : "-"
  const nilPct =
    totalVotes > 0 ? ((results.nil / totalVotes) * 100).toFixed(2) : "-"

  return (
    <>
      <div>
        <GradientChart percent={Number(counted)} className="my-1" />
        {!expanded && <LinearParlament onClick={() => setExpanded(true)} />}
      </div>
      <div className="flex text-xs">
        <div className="flex-grow">{blankPct}% Vots blancs</div>
        <div className="flex-grow text-right">{nilPct}% Vots nuls</div>
      </div>
      {expanded && children}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="m-auto text-md block -mb-2 font-semibold text-gray-700"
      >
        {expanded ? "Tancar" : isProvince ? "Veure escons" : "Veure parlament"}
        <Arrow inverted={expanded} />
      </button>
    </>
  )
}

const LinearParlament: FC<{ onClick?: () => void }> = ({ onClick }) => {
  const results = useCurrentResults()
  const chartResults = recordFromEntries(
    recordEntries(results.parties).map(([id, result]) => [
      parties[id].color,
      result.sits,
    ]),
  )

  return <LineChart results={chartResults} onClick={onClick} />
}

const DetailView = () => {
  const selectedProvince = useSelectedProvince()
  const sits = selectedProvince ? sitsByProvince[selectedProvince] : totalSits
  const results = useCurrentResults()
  const relevantParties = recordEntries(results.parties)
    .filter(([, p]) => p.sits > 0)
    .sort(([, a], [, b]) => b.sits - a.sits || b.votes - a.votes)

  const chartResults = recordFromEntries(
    relevantParties.map(([id, result]) => [parties[id].color, result.sits]),
  )

  return (
    <>
      {selectedProvince ? (
        <Suspense fallback={null}>
          <SitsChart />
        </Suspense>
      ) : (
        <HalfDonut
          results={chartResults}
          total={sits}
          className="mx-auto my-1 max-w-lg"
        />
      )}
      <ul className="flex flex-wrap justify-center">
        {relevantParties.map(([id, p]) => (
          <li className="text-sm px-2" key={id}>
            <div
              className="p-1 mr-1 inline-block border border-black"
              style={{ backgroundColor: parties[id].color }}
            />
            {parties[id].name}
          </li>
        ))}
      </ul>
    </>
  )
}

const Arrow: FC<{ inverted: boolean }> = ({ inverted }) => (
  <svg
    className="h-6 w-6 transform inline-block"
    style={
      {
        "--tw-scale-y": inverted ? -1 : 1,
      } as any
    }
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
)
