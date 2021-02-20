import { useEffect, useState } from "react"
import { provinceNames, Provinces } from "@/api/provinces"
import { changeProvince, useSelectedProvince } from "./AreaPicker.state"

export const AreaPicker = () => {
  return (
    <nav className="mt-2 text-center px-1 text-gray-600 font-bold">
      <DropDown />
    </nav>
  )
}
const not = (x: boolean) => !x

const DropDown: React.FC = () => {
  const selectedProvince = useSelectedProvince()
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => {
    if (!isOpen) return
    function close() {
      setIsOpen(false)
    }
    function onDone(e: KeyboardEvent | React.KeyboardEvent<any>) {
      if (e.key === "Escape") {
        close()
      }
    }
    document.addEventListener("click", close)
    document.addEventListener("keydown", onDone)
    return () => {
      document.removeEventListener("click", close)
      document.removeEventListener("keydown", onDone)
    }
  }, [isOpen])
  /* eslint-disable jsx-a11y/anchor-is-valid */
  return (
    <div className="relative inline-block text-left w-full max-w-lg mx-auto font-bold">
      <div>
        <button
          type="button"
          className="text-gray-700 font-bold inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
          id="options-menu"
          aria-haspopup="true"
          aria-expanded="true"
          onClick={() => setIsOpen(not)}
        >
          {selectedProvince ? provinceNames[selectedProvince] : "Catalunya"}
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div
        className={`origin-top-right absolute w-full right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50 ${
          isOpen ? "block" : "hidden"
        }`}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="options-menu"
      >
        <div className="py-1">
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault()
              changeProvince(null)
              setIsOpen(false)
            }}
          >
            Catalunya
          </a>
        </div>
        <div className="py-1">
          {Object.values(Provinces).map((province) => (
            <a
              href="#"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
              key={province}
              onClick={(e) => {
                e.preventDefault()
                changeProvince(province)
                setIsOpen(false)
              }}
            >
              {provinceNames[province]}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
