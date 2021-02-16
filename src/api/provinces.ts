export enum Provinces {
  BCN = "BCN",
  LLE = "LLE",
  GIR = "GIR",
  TAR = "TAR",
}

export const sitsByProvince: Record<Provinces | "CAT", number> = {
  [Provinces.BCN]: 85,
  [Provinces.TAR]: 18,
  [Provinces.GIR]: 17,
  [Provinces.LLE]: 15,
  CAT: 135,
}

export const provinceNames: Record<Provinces, string> = {
  [Provinces.BCN]: "Barcelona",
  [Provinces.TAR]: "Tarragona",
  [Provinces.GIR]: "Girona",
  [Provinces.LLE]: "Lleida",
}
