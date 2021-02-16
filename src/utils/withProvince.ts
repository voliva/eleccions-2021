import { Provinces } from "api/provinces"
import { selectedProvince$ } from "App/Results/AreaPicker"
import { Observable } from "rxjs"
import { filter, map, withLatestFrom } from "rxjs/operators"

export const withProvince = <T>(
  source$: Observable<T>,
): Observable<[T, Provinces]> =>
  source$.pipe(
    withLatestFrom(selectedProvince$),
    filter((x) => !!x[1]),
  ) as Observable<[T, Provinces]>

export const withoutProvince = <T>(source$: Observable<T>) =>
  source$.pipe(
    withLatestFrom(selectedProvince$),
    filter((x) => !x[1]),
    map((x) => x[0]),
  )
