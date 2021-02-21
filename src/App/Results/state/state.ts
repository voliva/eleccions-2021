import { votes$ } from "@/api/votes"
import { bind } from "@react-rxjs/core"
import { switchMap } from "rxjs/operators"
import { selectedProvince$ } from "../AreaPicker"
import { createResultStreams } from "./results"

const { getResults$ } = createResultStreams(votes$)

export const [useCurrentResults, currentResults$] = bind(
  selectedProvince$.pipe(switchMap(getResults$)),
)
