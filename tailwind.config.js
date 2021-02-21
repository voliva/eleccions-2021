module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        main: "#1F8C62",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
