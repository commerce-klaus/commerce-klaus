"use strict"

const server = require("server")

// Ignore only because of the Vite+ environment.
// @ts-ignore -- `module.superModule` is provided by SFCC and resolved by typescript-sfcc.
server.extend(module.superModule)

server.prepend("Show", function checkProductAccess(_request, response, next) {
  response.setViewData({ accessChecked: true })
  next()
})

server.append("Show", function enrichWithLoyalty(_request, response, next) {
  const viewData = response.getViewData()
  response.setViewData(Object.assign({}, viewData, { loyaltyEnabled: true }))
  next()
})

server.replace("Recommendations", function personalizeRecommendations(_request, response, next) {
  response.json({ personalized: true, productIds: [] })
  next()
})

module.exports = server.exports()
