"use strict"

const server = require("server")

server.get("Show", function renderProduct(_request, response, next) {
  response.render("product/product", { available: true })
  next()
})

server.get("Recommendations", function loadRecommendations(_request, response, next) {
  response.json({ productIds: [] })
  next()
})

module.exports = server.exports()
