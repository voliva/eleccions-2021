const fetch = require("node-fetch")

const DOMAIN_NAME =
  process.env.VERCEL_GIT_COMMIT_REF === "main"
    ? "eleccions2021.vercel.app"
    : "test-eleccions2021.vercel.app"

const DATA_SOURCE =
  process.env.VERCEL_GIT_COMMIT_REF === "main"
    ? process.env.DATA_SOURCE
    : process.env.STAGING_DATA_SOURCE

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate")
  res.setHeader("Access-Control-Allow-Methods", "GET")
  res.setHeader("Access-Control-Allow-Headers", "pragma")

  const indexFetch = fetch(
    `https://${DOMAIN_NAME}/real_index.html`,
  ).then((res) => res.text())
  const dataFetch = fetch(DATA_SOURCE).then((res) => res.text())

  Promise.all([indexFetch, dataFetch]).then(
    ([content, data]) => {
      res.send(
        content.replace(
          "</head>",
          `<script>window.data=${data}</script></head>`,
        ),
      )
    },
    (error) => {
      res.send("Error " + error.message)
    },
  )
}
