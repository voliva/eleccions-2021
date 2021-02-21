import { FC } from "react"
import { merge } from "rxjs"
import { filter, map, switchMap } from "rxjs/operators"
import { Subscribe } from "@react-rxjs/core"
import { useHistory, useParams } from "react-router"
import { Link, matchPath } from "react-router-dom"
import { parties, PartyId } from "@/api/parties"
import { Provinces } from "@/api/provinces"
import { location$ } from "@/App/history"
import { PartyResult } from "@/App/Results/PartyResult"
import { Logo } from "./Logo"
import { partyResult$, usePartyResult } from "./party.state"
import { BackArrow } from "./BackArrow"

const PartyPage: FC = () => {
  const match = useParams<{ id: PartyId }>()
  const party = parties[match.id]
  const history = useHistory()

  const backBtn =
    history.action === "PUSH" ? (
      <div className="cursor-pointer" onClick={history.goBack}>
        <BackArrow />
      </div>
    ) : (
      <Link to="/">
        <BackArrow />
      </Link>
    )

  return (
    <div className={`h-screen overflow-hidden flex flex-col`}>
      <div
        className={`p-1.5 flex gap-2 items-center text-lg font-bold border-b text-gray-700 border-gray-400`}
      >
        {backBtn}
        <div>{party.name}</div>
      </div>
      <div className="p-2 overflow-auto flex gap-1 flex-col">
        <Logo
          party={match.id}
          className="max-w-full h-40 min-w-40 bg-white p-2 rounded-xl m-auto mb-2"
        />
        <ProvinceResult province={null} party={match.id} />
        <div className="grid grid-cols-2 gap-1">
          <ProvinceResult province={Provinces.BCN} party={match.id} />
          <ProvinceResult province={Provinces.GIR} party={match.id} />
          <ProvinceResult province={Provinces.LLE} party={match.id} />
          <ProvinceResult province={Provinces.TAR} party={match.id} />
        </div>
      </div>
    </div>
  )
}

const ProvinceResult: FC<{ province: Provinces | null; party: PartyId }> = ({
  province,
  party,
}) => {
  const result = usePartyResult(party, province)

  return (
    <div className="bg-white rounded px-2 py-1">
      <div className="text-center border-b border-current font-bold">
        {province === null ? "Catalunya" : province}
      </div>
      {result && <PartyResult partyId={party} {...result} />}
    </div>
  )
}

const selectedParty$ = location$.pipe(
  map((location) => {
    const match = matchPath<{ id: PartyId }>(location.pathname, "/party/:id")
    return match?.params.id!
  }),
  filter((v) => v !== undefined),
)
const partyPage$ = selectedParty$.pipe(
  switchMap((party) =>
    merge(
      partyResult$(party, null),
      ...Object.values(Provinces).map((province) =>
        partyResult$(party, province),
      ),
    ),
  ),
)

const Party = () => (
  <Subscribe source$={partyPage$}>
    <PartyPage />
  </Subscribe>
)

type t = React.ReactElement

export default Party
