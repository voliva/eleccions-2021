import { votes$ } from "@/api/votes"
import { bind } from "@react-rxjs/core"
import { switchMap } from "rxjs/operators"
import { selectedProvince$ } from "../components/AreaPicker"
import { createResultStreams } from "./results"

const { results$, getResults$ } = createResultStreams(votes$)

export const [useCurrentResults, currentResults$] = bind(
  selectedProvince$.pipe(switchMap(getResults$)),
)
export { results$ }
