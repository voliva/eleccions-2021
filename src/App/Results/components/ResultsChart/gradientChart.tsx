import { FC } from "react"

export const GradientChart: FC<{
  percent: number
  className?: string
}> = ({ percent, className }) => {
  return (
    <div className={`bg-gray-200 rounded-full ${className}`}>
      <div
        className="py-1 bg-gradient-to-r from-yellow-500 to-green-700 rounded-full w-full"
        style={{ clipPath: `inset(0% ${100 - percent}% 0% 0%)` }}
      ></div>
    </div>
  )
}
