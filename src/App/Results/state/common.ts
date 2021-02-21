import { PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { isResults$ } from "@/App/ResultsOrPrediction"
import { add } from "@/utils/add"
import { recordEntries } from "@/utils/record-utils"
import { reduceRecord } from "@/utils/reduceRecord"
import { bind } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { merge } from "rxjs"
import { distinctUntilChanged, filter, map, mapTo } from "rxjs/operators"

export interface PartyResults {
  id: PartyId
  votes: number
  percent: number
  sits: number
}

export interface Results {
  nil: number
  white: number
  parties: Record<PartyId, PartyResults>
  sits: string[]
}

export const [editParty$, onEditParty] = createListener<PartyId>()
export const [doneEditing$, onDoneEditing] = createListener()

export const [useEditingParty, editingParty$] = bind(
  merge(editParty$, doneEditing$.pipe(mapTo(null))),
  null,
)

export const [useIsEditingMe] = bind(
  (party: PartyId) => editingParty$.pipe(map((x) => x === party)),
  false,
)

export const currentParty$ = editingParty$.pipe(
  filter((x): x is PartyId => x !== null),
)

const [predictionInput$_, onPredictionChange] = createListener<string>()
export const [toggleLock$, onToggleLock] = createListener<PartyId>()
export const predictionInput$ = predictionInput$_.pipe(distinctUntilChanged())
export { onPredictionChange }

export const [reset$, onReset] = createListener()

export const [useIsPristine] = bind(
  merge(predictionInput$.pipe(mapTo(false)), reset$.pipe(mapTo(true))),
  true,
)

export const [useIsEditing] = bind(
  isResults$.pipe(map((isResults) => !isResults)),
  false,
)

export const [
  isManipulatingBar$,
  setIsManipulatinBar,
] = createListener<boolean>()

export const mergeResults = (results: Record<Provinces, Results>) => {
  const result = reduceRecord(
    results,
    (acc, current) => {
      acc.nil += current.nil
      acc.white += current.white
      recordEntries(current.parties).forEach(([partyId, { votes, sits }]) => {
        if (!acc.parties[partyId]) {
          acc.parties[partyId] = { id: partyId, votes, sits, percent: 0 }
        } else {
          acc.parties[partyId].sits += sits
          acc.parties[partyId].votes += votes
        }
      })
      return acc
    },
    { nil: 0, white: 0, parties: {} } as Results,
  )

  const validVotes =
    result.white +
    Object.values(result.parties)
      .map((party) => party.votes)
      .reduce(add)

  Object.values(result.parties).forEach((party) => {
    party.percent = validVotes && party.votes / validVotes
  })

  return result
}
