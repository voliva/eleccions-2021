import { reduceRecord } from "@/utils/reduceRecord"

export enum Provinces {
  BCN = "BCN",
  LLE = "LLE",
  GIR = "GIR",
  TAR = "TAR",
}

export const sitsByProvince: Record<Provinces, number> = {
  [Provinces.BCN]: 85,
  [Provinces.TAR]: 18,
  [Provinces.GIR]: 17,
  [Provinces.LLE]: 15,
}
export const totalSits = reduceRecord(sitsByProvince, (acc, v) => acc + v, 0)

export const provinceNames: Record<Provinces, string> = {
  [Provinces.BCN]: "Barcelona",
  [Provinces.TAR]: "Tarragona",
  [Provinces.GIR]: "Girona",
  [Provinces.LLE]: "Lleida",
}
