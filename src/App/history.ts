import { shareLatest } from "@react-rxjs/core"
import { createBrowserHistory } from "history"
import { Observable } from "rxjs"

export const history = createBrowserHistory()

export const location$ = new Observable<typeof history["location"]>(
  (observer) => {
    observer.next(history.location)
    const historySubs = history.listen(() => {
      observer.next(history.location)
    })
    return historySubs
  },
).pipe(shareLatest())
