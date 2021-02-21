export const reduceRecord = <
  TSource extends Record<string, {}>,
  TResult = TSource extends Record<string, infer R> ? R : {}
>(
  source: TSource,
  reducer: (
    old: TResult,
    value: TSource extends Record<string, infer R> ? R : {},
    index: number,
    keys: Array<keyof TSource>,
  ) => TResult,
  initialValue?: TResult,
  keys: Array<keyof TSource> = Object.keys(source),
): TResult =>
  initialValue !== undefined
    ? keys.reduce(
        (acc, key, idx) => reducer(acc, source[key] as any, idx, keys),
        initialValue,
      )
    : ((keys.reduce(
        (acc, key, idx) =>
          reducer(acc as any, source[key] as any, idx, keys) as any,
      ) as any) as TResult)
