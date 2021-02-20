import ReactDOM from "react-dom"
import "./index.css"
import { App } from "./App"
import { StrictMode } from "react"
import { deferredPrediction } from "./App/Results/Prediction"
import * as serviceWorkerRegistration from "./serviceWorkerRegistration"

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById("root"),
)

new Promise<[ServiceWorkerRegistration, boolean]>((res) => {
  serviceWorkerRegistration.register({
    onUpdate: (x) => res([x, true]),
    onSuccess: (x) => res([x, false]),
  })
}).then(([registration, isUpdate]) => {
  if (!isUpdate) return
  deferredPrediction.then(() => {
    registration.waiting?.postMessage({ type: "SKIP_WAITING" })
  })
})
