// import { lazy, Suspense } from "react"
import { Subscribe } from "@react-rxjs/core"
import { PartyId } from "@/api/parties"
import { Result, result$ } from "./Result"
// import { deferredPrediction } from "../Prediction"

// const Prediction = lazy(() => deferredPrediction)

export const ResultRow: React.FC<{ partyId: PartyId }> = ({ partyId }) => {
  return (
    <Subscribe source$={result$(partyId)}>
      <Result partyId={partyId} />
      {/* <Suspense fallback={null}>
        <Prediction partyId={partyId} />
      </Suspense> */}
    </Subscribe>
  )
}
