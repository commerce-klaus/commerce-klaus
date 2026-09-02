const server = require("server")

server.get("Show", function (req, res, next) {
  req.trace.push("base")
  res.render("test/show", { base: true })
  next()
})

server.post("Submit", function (req, res, next) {
  res.json({ accepted: req.form.accepted })
  next()
})

server.get("Replace", function (req, _res, next) {
  req.trace.push("base-replace")
  next()
})

module.exports = server.exports()
