const server = require("server")

server.get(
  "Show",
  function (req, res, next) {
    res.setViewData({ first: req.querystring.value })
    next()
  },
  function (_req, res, next) {
    res.render("test/show", { second: true })
    next()
  },
)

server.post("Submit", function (req, res, next) {
  res.json({ accepted: req.form.accepted })
  next()
})

module.exports = server.exports()
