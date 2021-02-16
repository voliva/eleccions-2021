const formatter = new Intl.NumberFormat()
export const formatNumber = formatter.format.bind(formatter)

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 2,
})
export const formatPercent = percentFormatter.format.bind(percentFormatter)
