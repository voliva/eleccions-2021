import { merge } from "rxjs"
import { createListener } from "@react-rxjs/utils"
import { bind } from "@react-rxjs/core"
import { distinctUntilChanged, filter, map, mapTo } from "rxjs/operators"
import { isResults$ } from "@/App/ResultsOrPrediction"
import { Party, PartyId } from "@/api/parties"
import { Votes } from "@/api/votes"
import { Provinces } from "@/api/provinces"
import { recordEntries } from "@/utils/record-utils"
import { add } from "@/utils/add"

export interface PartyResults {
  party: Party
  votes: number
  percent: number
  sits: number
}

export interface Results extends Omit<Votes, "parties"> {
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
  const result = Object.values(results).reduce(
    (acc, current) => {
      acc.nil += current.nil
      acc.white += current.white
      recordEntries(current.parties).forEach(
        ([partyId, { party, votes, sits }]) => {
          if (!acc.parties[partyId]) {
            acc.parties[partyId] = { party, votes, sits, percent: 0 }
          } else {
            acc.parties[partyId].sits += sits
            acc.parties[partyId].votes += votes
          }
        },
      )
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
