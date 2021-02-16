import React from "react"
import ReactDOM from "react-dom"
import "./index.css"
import { App } from "./App"
import { deferredPrediction } from "./App/Results/Prediction"
import * as serviceWorkerRegistration from "./serviceWorkerRegistration"

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log)
