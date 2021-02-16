export const getTextColor = (backgroundColor: string) =>
  isContrastDark(backgroundColor) ? "text-gray-900" : "text-gray-100"

export const isContrastDark = (hexcolor: string) => {
  if (hexcolor[0] === "#") {
    hexcolor = hexcolor.slice(1)
  }

  if (hexcolor.length === 3) {
    hexcolor = hexcolor
      .split("")
      .map(function (hex) {
        return hex + hex
      })
      .join("")
  }

  var r = parseInt(hexcolor.substr(0, 2), 16)
  var g = parseInt(hexcolor.substr(2, 2), 16)
  var b = parseInt(hexcolor.substr(4, 2), 16)

  var yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128
}
