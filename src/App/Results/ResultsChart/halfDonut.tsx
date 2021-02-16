import { FC, SVGAttributes } from "react"

const MIN_ANGLE = (1 * Math.PI) / 180
const MARGIN = (0.2 * Math.PI) / 180
const CANVAS_SIZE = 1000
const STROKE_WIDTH = 20
const BORDER_WIDTH = 2
const FONT_SIZE = 30

export const HalfDonut: FC<{
  results: Record<string, number>
  total: number
  className?: string
}> = ({ results, total, className }) => {
  const realTotal = Object.values(results).reduce((a, b) => a + b, 0)
  const sortedEntries = Object.entries(results)
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1])

  let alpha = 0
  const shareableAngle = Math.PI - 2 * (sortedEntries.length - 1) * MARGIN
  const adjustedShareableAngle =
    shareableAngle -
    sortedEntries.reduce((acc, [, v]) => {
      const totalAngle = (shareableAngle * v) / realTotal
      if (totalAngle < MIN_ANGLE) {
        return acc + MIN_ANGLE - totalAngle / realTotal
      }
      return acc
    }, 0)

  const angles = Object.fromEntries(
    sortedEntries.map(([name, value], i) => {
      const totalAngle = Math.max(
        (adjustedShareableAngle * value) / realTotal,
        MIN_ANGLE,
      )
      const startAngle = i === 0 ? 0 : alpha + MARGIN
      const endAngle =
        i === sortedEntries.length - 1 ? Math.PI : startAngle + totalAngle
      alpha = endAngle + MARGIN

      return [name, [startAngle, endAngle]]
    }),
  )

  const arcParams = {
    cx: CANVAS_SIZE / 2,
    cy: CANVAS_SIZE / 2 - CANVAS_MARGIN,
    r: CANVAS_SIZE / 2 - 2 * CANVAS_MARGIN,
    fill: "none",
  }
  return (
    <svg
      viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE / 2}`}
      className={className}
    >
      {/* Border */}
      <CenterArc
        {...arcParams}
        start={-MARGIN}
        end={Math.PI + MARGIN}
        stroke="black"
        strokeWidth={STROKE_WIDTH + BORDER_WIDTH * 2}
      />
      {/* Fills */}
      {Object.entries(angles).map(([color, [start, end]]) => (
        <CenterArc
          {...arcParams}
          key={color}
          start={start}
          end={end}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
        />
      ))}
      {/* Center */}
      <line
        x1={CANVAS_SIZE / 2}
        x2={CANVAS_SIZE / 2}
        y1="0"
        y2={CANVAS_MARGIN + 2 * STROKE_WIDTH}
        stroke="black"
        strokeWidth={BORDER_WIDTH}
      />
      <text
        x={CANVAS_SIZE / 2}
        y={CANVAS_MARGIN + 2 * STROKE_WIDTH}
        fill="black"
        fontSize={FONT_SIZE}
        textAnchor="middle"
        alignmentBaseline="hanging"
      >
        Majoria {Math.ceil(total / 2)}
      </text>
    </svg>
  )
}

const CANVAS_MARGIN = STROKE_WIDTH / 2 + STROKE_WIDTH

const CenterArc: FC<
  {
    cx: number
    cy: number
    r: number
    // angle=0 => Left, angle=Pi/2 => Top
    start: number
    end: number
  } & SVGAttributes<SVGCircleElement>
> = ({ cx, cy, r, start, end, ...rest }) => {
  const startPct = {
    x: 50 - 100 * Math.cos(start),
    y: 50 - 100 * Math.sin(start),
  }
  const halfPct = {
    x: 50 - 100 * Math.cos(start + (end - start) / 2),
    y: 50 - 100 * Math.sin(start + (end - start) / 2),
  }
  const endPct = {
    x: 50 - 100 * Math.cos(end),
    y: 50 - 100 * Math.sin(end),
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      {...rest}
      clipPath={`polygon(50% 50%, ${startPct.x}% ${startPct.y}%, ${halfPct.x}% ${halfPct.y}%, ${endPct.x}% ${endPct.y}%)`}
    />
  )
}
