import { Subscribe } from "@react-rxjs/core"
import { parties, PartyId } from "@/api/parties"
import { ProgressBar } from "@/components/progressBar"
import { useEffect, useRef } from "react"
import { useIsEditingMe } from "./Edit"
import {
  commitPrediction,
  editPartyPrediction,
  partyPrediction$,
  usePartyPrediction,
} from "./state"

function onDone(e: KeyboardEvent | React.KeyboardEvent<any>) {
  if (e.key === "Escape" || e.key === "Enter") {
    commitPrediction()
  }
}

const FormBase: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  const party = parties[partyId]
  const value = usePartyPrediction(partyId)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    function onClickDocument(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as any)) {
        commitPrediction()
      }
    }
    document.addEventListener("click", onClickDocument)
    document.addEventListener("keydown", onDone)
    return () => {
      document.removeEventListener("click", onClickDocument)
      document.removeEventListener("keydown", onDone)
      commitPrediction()
    }
  }, [])
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        commitPrediction()
      }}
      className="w-full flex flex-wrap"
    >
      <label className="flex-grow my-2" htmlFor="prediccio-text">
        Quin percentatge dels vots <b>no escrutats</b> creus que s'endurà{" "}
        {party.name}?
      </label>
      <div className="flex w-full flex-grow items-center">
        <ProgressBar
          className="rounded-md my-2 w-full flex-grow"
          width={value * 100}
          color={party.color}
        >
          <input
            name="prediccio-barra"
            type="range"
            className={`absolute w-full h-full appearance-none bg-transparent top-0 outline-none`}
            style={{ cursor: "col-resize" }}
            min="0"
            max={100}
            step={0.01}
            value={(value * 100).toFixed()}
            onChange={(e) =>
              editPartyPrediction({
                party: partyId,
                prediction: e.target.valueAsNumber,
              })
            }
          />
        </ProgressBar>
        <p className="flex-grow-0 flex ml-4">
          <input
            className="w-14 py-1 text-center"
            ref={inputRef}
            type="number"
            name="prediccio-text"
            min={0}
            max={100}
            step={0.01}
            value={(value * 100).toFixed(2)}
            onChange={(e) =>
              editPartyPrediction({
                party: partyId,
                prediction: e.target.valueAsNumber,
              })
            }
          />
          <span className="py-1">%</span>
        </p>
      </div>
    </form>
  )
}

const Form: React.FC<{ partyId: PartyId }> = ({ partyId }) =>
  useIsEditingMe(partyId) ? (
    <Subscribe source$={partyPrediction$(partyId)}>
      <FormBase partyId={partyId} />
    </Subscribe>
  ) : null

export default Form
