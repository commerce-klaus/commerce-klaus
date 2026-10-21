import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import rule from "../src/plugins/sitegenesis/no-global-require.js"

const controllerFilename = "cartridges/app/cartridge/controllers/Example.js"
const scriptFilename = "cartridges/app/cartridge/scripts/Example.js"

function lint(code: string, filename = controllerFilename, options?: { allowShared?: boolean }) {
  const linter = new Linter()
  return linter.verify(
    code,
    {
      files: ["**/*.js"],
      languageOptions: { ecmaVersion: 2022, sourceType: "commonjs" },
      plugins: { sitegenesis: { rules: { "no-global-require": rule } } },
      rules: {
        "sitegenesis/no-global-require": ["error", ...(options ? [options] : [])],
      },
    },
    { filename },
  )
}

test("reports a require used by only one exported route", () => {
  const messages = lint(`
    var ProductMgr = require("dw/catalog/ProductMgr")
    function start() { return ProductMgr.getProduct("1") }
    function submit() {}
    exports.Start = start
    exports.Submit = submit
  `)

  expect(messages.map((message) => message.messageId)).toEqual(["routeSpecificRequire"])
})

test("recognizes guard-wrapped and module.exports routes", () => {
  const guardedMessages = lint(`
    var ProductMgr = require("dw/catalog/ProductMgr")
    function start() { return ProductMgr.getProduct("1") }
    function submit() {}
    exports.Start = guard.ensure(["get"], start)
    exports.Submit = guard.ensure(["post"], submit)
  `)
  const directMessages = lint(`
    var ProductMgr = require("dw/catalog/ProductMgr")
    module.exports.Start = function () { return ProductMgr.getProduct("1") }
    module.exports.Submit = function () {}
  `)

  expect(guardedMessages.map((message) => message.messageId)).toEqual(["routeSpecificRequire"])
  expect(directMessages.map((message) => message.messageId)).toEqual(["routeSpecificRequire"])
})

test("allows a require used by every exported route", () => {
  const messages = lint(`
    var URLUtils = require("dw/web/URLUtils")
    function start() { return URLUtils.url("Home-Show") }
    function submit() { return URLUtils.url("Home-Show") }
    exports.Start = start
    exports.Submit = submit
  `)

  expect(messages).toHaveLength(0)
})

test("does not count unexported helpers as routes", () => {
  const messages = lint(`
    var ProductMgr = require("dw/catalog/ProductMgr")
    function findProduct() { return ProductMgr.getProduct("1") }
    function start() { return findProduct() }
    exports.Start = start
  `)

  expect(messages.map((message) => message.messageId)).toEqual(["routeSpecificRequire"])
})

test("reports dependencies shared by helpers with a precise message", () => {
  const code = `
    var ProductMgr = require("dw/catalog/ProductMgr")
    function findProduct() { return ProductMgr.getProduct("1") }
    function findVariation() { return ProductMgr.getProduct("2") }
    function start() { return findProduct() || findVariation() }
    function submit() {}
    exports.Start = start
    exports.Submit = submit
  `

  expect(lint(code).map((message) => message.messageId)).toEqual(["sharedRequire"])
  expect(lint(code, controllerFilename, { allowShared: true })).toHaveLength(0)
})

test("suggests moving a single-consumer declaration", () => {
  const code = `var ProductMgr = require("dw/catalog/ProductMgr")
function start() {
  return ProductMgr.getProduct("1")
}
function submit() {}
exports.Start = start
exports.Submit = submit`
  const [message] = lint(code)
  const suggestion = message?.suggestions?.[0]

  expect(suggestion?.messageId).toBe("moveRequire")
  expect(
    suggestion?.fix
      ? code.slice(0, suggestion.fix.range[0]) +
          suggestion.fix.text +
          code.slice(suggestion.fix.range[1])
      : undefined,
  ).toBe(`
function start() {
  var ProductMgr = require("dw/catalog/ProductMgr")
  return ProductMgr.getProduct("1")
}
function submit() {}
exports.Start = start
exports.Submit = submit`)
})

test.each([
  `
    /** @type {typeof dw.catalog.ProductMgr} */
    var ProductMgr = require("dw/catalog/ProductMgr")
    function start() { return ProductMgr.getProduct("1") }
    function submit() {}
    exports.Start = start
    exports.Submit = submit
  `,
  `
    var ProductMgr = require("dw/catalog/ProductMgr")
    function start() {
      "use strict"
      return ProductMgr.getProduct("1")
    }
    function submit() {}
    exports.Start = start
    exports.Submit = submit
  `,
])("does not suggest a move that could change comments or directive placement", (code) => {
  const [message] = lint(code)

  expect(message?.messageId).toBe("routeSpecificRequire")
  expect(message?.suggestions).toBeUndefined()
})

test("allows global usage, inline requires, and files outside controllers", () => {
  expect(
    lint(`
      var Logger = require("dw/system/Logger")
      Logger.info("loaded")
      function start() {}
      exports.Start = start
    `),
  ).toHaveLength(0)
  expect(
    lint(`
      function start() {
        return require("dw/catalog/ProductMgr").getProduct("1")
      }
      exports.Start = start
    `),
  ).toHaveLength(0)
  expect(
    lint(
      `
        var ProductMgr = require("dw/catalog/ProductMgr")
        function start() {}
        exports.Start = start
      `,
      scriptFilename,
    ),
  ).toHaveLength(0)
})

test("does not report when no exported route can be identified", () => {
  const messages = lint(`
    var ProductMgr = require("dw/catalog/ProductMgr")
    function helper() { return ProductMgr.getProduct("1") }
  `)

  expect(messages).toHaveLength(0)
})
