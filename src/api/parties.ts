import { mapRecord } from "../utils/record-utils"

export enum PartyId {
  AlianzaCV = "acv",
  Cs = "cs",
  CUP = "cup",
  EsconsEnBlanc = "eb",
  Comuns = "ecp",
  ERC = "erc",
  FNC = "fnc",
  IZQP = "izqp",
  Junts = "junts",
  MCR = "mcr",
  Primaries = "primaries",
  PCTC = "pctc",
  PDeCAT = "pdecat",
  PNC = "pnc",
  PP = "pp",
  PSC = "psc",
  PUM_J = "pum_j",
  RecortesZero_UCE = "uce",
  Scat = "scat",
  TerresEbre = "ebre",
  Pensionistas = "uep",
  Unidos = "unidos",
  Vox = "vox",
}

export interface Party {
  id: PartyId
  name: string
  color: string
}

export const parties: Record<PartyId, Party> = mapRecord(
  {
    [PartyId.Cs]: {
      name: "C's",
      color: "#FF6419",
    },
    [PartyId.PDeCAT]: {
      name: "PDeCAT",
      color: "#0069B9",
    },
    [PartyId.ERC]: {
      name: "ERC",
      color: "#FDB94D",
    },
    [PartyId.PSC]: {
      name: "PSC",
      color: "#E10819",
    },
    [PartyId.Comuns]: {
      name: "ECP-PEC",
      color: "#4E1E64",
    },
    [PartyId.CUP]: {
      name: "CUP-G",
      color: "#FFEF01",
    },
    [PartyId.PP]: {
      name: "PP",
      color: "#002864",
    },
    [PartyId.Junts]: {
      name: "Junts",
      color: "#00C5B3",
    },
    [PartyId.Vox]: {
      name: "Vox",
      color: "#63BE21",
    },
    [PartyId.PNC]: {
      name: "PNC",
      color: "#00ABB8",
    },
    [PartyId.Primaries]: {
      name: "Primaries",
      color: "#FFB464",
    },
    [PartyId.RecortesZero_UCE]: {
      name: "RECORTES CERO - GV - M",
      color: "#005000",
    },
    [PartyId.PCTC]: {
      name: "PCTC",
      color: "#B0BD1D",
    },
    [PartyId.FNC]: {
      name: "FNC",
      color: "#00A8F9",
    },
    [PartyId.IZQP]: {
      name: "IZQP",
      color: "#FFB4B4",
    },
    [PartyId.PUM_J]: {
      name: "PUM+J",
      color: "#82D2F0",
    },
    [PartyId.MCR]: {
      name: "M.C.R.",
      color: "#FF5064",
    },
    [PartyId.EsconsEnBlanc]: {
      name: "Escons en Blanc",
      color: "#BE823C",
    },
    [PartyId.AlianzaCV]: {
      name: "Alianza CV",
      color: "#FFFAB4",
    },
    [PartyId.Scat]: {
      name: "Suport Civil Català",
      color: "#AAE696",
    },
    [PartyId.TerresEbre]: {
      name: "Som Terres de l'Ebre",
      color: "#789628",
    },
    [PartyId.Pensionistas]: {
      name: "Unión Europea de Pensionistas",
      color: "#B4A0D2",
    },
    [PartyId.Unidos]: {
      name: "Unidos por la Democracia + Jubilados",
      color: "#C850BE",
    },
  },
  (entry, id) => ({ ...entry, id }),
)
