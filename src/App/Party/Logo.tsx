import { PartyId } from "@/api/parties"
import { FC, ImgHTMLAttributes } from "react"

export const Logo: FC<
  { party: PartyId } & ImgHTMLAttributes<HTMLImageElement>
> = ({ party, ...rest }) => {
  const logoDef = logoDefs[party]

  if (logoDef.type === "svg") {
    return (
      <img alt={`${party} logo`} {...rest} src={`/logos/${party}/logo.svg`} />
    )
  }

  const srcSet = logoDef.sizes
    .map((size) => `/logos/${party}/${size}.${logoDef.type} ${size}w`)
    .join(", ")
  const lastSize = logoDef.sizes[logoDef.sizes.length - 1]
  const sizes = [
    ...logoDef.sizes
      .slice(0, -1)
      .map((size) => `(max-width: ${size}px) ${size}px`),
    `${lastSize}px`,
  ].join(", ")

  return (
    <img
      alt={`${party} logo`}
      {...rest}
      srcSet={srcSet}
      sizes={sizes}
      src={`/logos/${party}/${lastSize}.${logoDef.type}`}
    />
  )
}

type LogoDef =
  | {
      type: "svg"
    }
  | {
      type: "png" | "jpg" | "webp"
      sizes: number[]
    }

const logoDefs: Record<PartyId, LogoDef> = {
  [PartyId.Cs]: { type: "svg" },
  [PartyId.PDeCAT]: { type: "svg" },
  [PartyId.ERC]: { type: "svg" },
  [PartyId.PSC]: { type: "svg" },
  [PartyId.Comuns]: { type: "svg" },
  [PartyId.CUP]: { type: "svg" },
  [PartyId.PP]: { type: "svg" },
  [PartyId.Junts]: { type: "png", sizes: [297, 594, 742] },
  [PartyId.Vox]: { type: "svg" },
  [PartyId.PNC]: { type: "jpg", sizes: [400] },
  [PartyId.Primaries]: { type: "jpg", sizes: [400] },
  [PartyId.RecortesZero_UCE]: { type: "jpg", sizes: [239, 478, 597] },
  [PartyId.PCTC]: { type: "png", sizes: [217, 435, 544] },
  [PartyId.FNC]: { type: "png", sizes: [499] },
  [PartyId.IZQP]: { type: "png", sizes: [320, 640, 800] },
  [PartyId.PUM_J]: { type: "svg" },
  [PartyId.MCR]: { type: "jpg", sizes: [340] },
  [PartyId.EsconsEnBlanc]: { type: "svg" },
  [PartyId.AlianzaCV]: { type: "png", sizes: [353] },
  [PartyId.Pensionistas]: { type: "png", sizes: [320, 891] },
  [PartyId.TerresEbre]: { type: "webp", sizes: [410] },
  [PartyId.Scat]: { type: "png", sizes: [325] },
  [PartyId.Unidos]: { type: "jpg", sizes: [240, 480, 600] },
}
