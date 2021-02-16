import { bind } from "@react-rxjs/core"
import { createListener } from "@react-rxjs/utils"
import { Provinces } from "api/provinces"

const [provinceChange$, changeProvince] = createListener<Provinces | null>()
export { changeProvince }

export const [useSelectedProvince, selectedProvince$] = bind(
  provinceChange$,
  null,
)
