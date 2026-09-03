const server = require("server")

server.extend(module.superModule)

server.prepend("Show", function (req, res, next) {
  req.trace.push("prepend")
  res.setViewData({ first: req.querystring.value })
  next()
})

server.append("Show", function (req, res, next) {
  req.trace.push("append")
  res.setViewData({ custom: true })
  next()
})

server.replace("Replace", function (req, res, next) {
  req.trace.push("replacement")
  res.json({ replaced: true })
  next()
})

module.exports = server.exports()
