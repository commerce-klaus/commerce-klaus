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

server.get("Raw", function (_req, res, next) {
  res.setContentType("text/xml")
  res.setStatusCode(202)
  res.print("<sitemap />")
  next()
})

server.get(
  "Redirect",
  function (_req, res, next) {
    res.cacheExpiration(2)
    res.log("redirect", { permanent: true })
    res.setHttpHeader("X-Redirect-Source", "controller")
    res.setRedirectStatus(301)
    res.redirect("/target")
    next()
  },
  function (_req, res, next) {
    res.setViewData({ shouldNotRun: true })
    next()
  },
)

module.exports = server.exports()
