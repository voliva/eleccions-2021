import { combineLatest, concat } from "rxjs"
import { map, take, withLatestFrom } from "rxjs/operators"
import { bind, Subscribe } from "@react-rxjs/core"
import { parties, PartyId } from "api/parties"
import { minMax$, multipliers$, prediction$ } from "./state.old"
import { ProgressBar } from "components/progressBar"
import { useEffect, useRef } from "react"
import { selectedProvince$ } from "../components/AreaPicker"
import { recordEntries } from "utils/record-utils"
import { add } from "utils/add"
import { useIsEditingMe } from "./Edit"

const value$ = concat(
  combineLatest([selectedProvince$, prediction$, currentParty$]).pipe(
    withLatestFrom(multipliers$),
    take(1),
    map(([[province, predictions, partyId], multipliers]) => {
      const res = province
        ? predictions[province][partyId]
        : recordEntries(predictions)
            .filter(([, x]) => x[partyId])
            .map(([province, x]) =>
              multipliers.provinceToGeneral(x[partyId], province),
            )
            .reduce(add, 0)
      return (res * 100).toFixed(2)
    }),
  ),
  predictionInput$.pipe(
    withLatestFrom(minMax$),
    map(([x, { min, max }]) => {
      const value = Number(x)
      if (Number.isNaN(value)) return x
      const finalValue = Math.max(min * 100, Math.min(value, max * 100))
      return finalValue === value ? x : finalValue.toFixed(2)
    }),
  ),
)

const party$ = currentParty$.pipe(map((key) => parties[key]))

const [useFormData, formData$] = bind(combineLatest([value$, party$]))
function onDone(e: KeyboardEvent | React.KeyboardEvent<any>) {
  if (e.key === "Escape" || e.key === "Enter") {
    onDoneEditing()
  }
}
const startManipulating = () => {
  setIsManipulatinBar(true)
}
const stopManipulating = () => {
  setIsManipulatinBar(false)
}

const FormBase: React.FC = () => {
  const [value, party] = useFormData()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    function onClickDocument(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as any)) {
        onDoneEditing()
      }
    }
    document.addEventListener("click", onClickDocument)
    document.addEventListener("keydown", onDone)
    return () => {
      document.removeEventListener("click", onClickDocument)
      document.removeEventListener("keydown", onDone)
    }
  }, [])
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        onDoneEditing()
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
          width={value}
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
            value={value}
            onMouseDown={startManipulating}
            onTouchStart={startManipulating}
            onTouchEnd={stopManipulating}
            onMouseUp={stopManipulating}
            onChange={(e) => onPredictionChange(e.target.value)}
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
            value={value}
            onChange={(e) => {
              onPredictionChange(e.target.value)
            }}
          />
          <span className="py-1">%</span>
        </p>
      </div>
    </form>
  )
}

const Form: React.FC<{ partyId: PartyId }> = ({ partyId }) =>
  useIsEditingMe(partyId) ? (
    <Subscribe source$={formData$}>
      <FormBase />
    </Subscribe>
  ) : null

export default Form
