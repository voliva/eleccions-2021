import { FC } from "react"

export const LineChart: FC<{
  results: Record<string, number>
  className?: string
  onClick?: () => void
}> = ({ results, className, onClick }) => {
  const sortedEntries = Object.entries(results)
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1])

  return (
    <div
      className={`bg-black border border-black divide-x divide-black flex
        rounded-full overflow-hidden  ${
          onClick && "cursor-pointer"
        } ${className}`}
      onClick={onClick}
    >
      {sortedEntries.map(([color, result]) => (
        <div
          key={color}
          className="py-1 w-1"
          style={{ backgroundColor: color, flexGrow: result }}
        ></div>
      ))}
    </div>
  )
}
