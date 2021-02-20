import { shareLatest } from "@react-rxjs/core"
import { concat, Observable, timer } from "rxjs"
import { switchMap } from "rxjs/operators"
import { PartyId } from "./parties"
import { Provinces } from "./provinces"

/*
export const DATA_SOURCE: any =
  import.meta.env.VERCEL_GIT_COMMIT_REF === "main"
    ? import.meta.env.DATA_SOURCE
    : import.meta.env.STAGING_DATA_SOURCE
*/
export const DATA_SOURCE =
  "https://storage.googleapis.com/eleccions-2021/election_data.json"

export const POLL_TIME = 60_000

const service$ = timer(0, POLL_TIME).pipe(
  switchMap(
    (): Promise<{
      participation: {
        data: Record<
          Provinces,
          {
            turnout: string
            abstention: string
          }
        >
        timestamp: number
      }
      counts: {
        data: Record<
          Provinces,
          {
            blanks: number
            nils: number
            parties: Record<PartyId, number>
          }
        >
        timestamp: number
      }
    }> => fetch(DATA_SOURCE).then((result) => result.json()),
  ),
)

declare global {
  interface Window {
    data: any
  }
}

const init$: typeof service$ = new Observable((observer) => {
  const sendWindowData = () => {
    if (window.data) observer.next(window.data)
    observer.complete()
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    fetch(DATA_SOURCE + ".init")
      .then((result) => result.json())
      .then((x) => {
        observer.next(x)
        observer.complete()
      })
      .catch(sendWindowData)
  } else {
    sendWindowData()
  }
})

export const source$: typeof service$ = concat(init$, service$).pipe(
  shareLatest(),
)
