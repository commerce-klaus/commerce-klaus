import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function lint(code: string, rule: string) {
  const linter = new Linter()
  return linter.verify(code, {
    languageOptions: { sourceType: "commonjs" },
    plugins: { sfcc },
    rules: { [rule]: "error" },
  })
}

test.each(["require('dw/system/Pipeline')", "import('dw/system/Pipeline')"])(
  "no-pipeline-api reports %s",
  (code) => {
    expect(lint(code, "sfcc/no-pipeline-api")).toHaveLength(1)
  },
)

test("no-pipeline-api ignores similarly named modules", () => {
  expect(lint("require('app_custom/Pipeline')", "sfcc/no-pipeline-api")).toHaveLength(0)
})

test.each(["require('server')", "import('server')"])("no-sfra-server reports %s", (code) => {
  expect(lint(code, "sfcc/no-sfra-server")).toHaveLength(1)
})

test("no-sfra-server ignores local server modules", () => {
  expect(lint("require('./server')", "sfcc/no-sfra-server")).toHaveLength(0)
})

test.each([
  "const template = require('dw/template/ISML')",
  "require('dw/util/Template')",
  "import('dw/template/ISML')",
])("no-isml-rendering reports template access through %s", (code) => {
  expect(lint(code, "sfcc/no-isml-rendering")).toHaveLength(1)
})

test("no-isml-rendering reports SFRA response rendering", () => {
  const messages = lint(
    `
      const server = require("server")
      server.get("Home", function (req, res, next) {
        res.render("home/homepage")
        next()
      })
    `,
    "sfcc/no-isml-rendering",
  )

  expect(messages.map((message) => message.messageId)).toEqual(["responseRender"])
})

test("no-isml-rendering supports aliased server and response bindings", () => {
  const messages = lint(
    `
      const router = require("server")
      router.post("Submit", (request, response, next) => {
        response["render"]("result")
        next()
      })
    `,
    "sfcc/no-isml-rendering",
  )

  expect(messages.map((message) => message.messageId)).toEqual(["responseRender"])
})

test("no-isml-rendering ignores unrelated render methods", () => {
  const messages = lint(
    `
      const server = { get: function () {} }
      server.get("Home", function (req, res) { res.render("home") })
      const view = { render: function () {} }
      view.render()
    `,
    "sfcc/no-isml-rendering",
  )

  expect(messages).toHaveLength(0)
})

test("no-isml-rendering ignores a shadowed server binding", () => {
  const messages = lint(
    `
      const server = require("server")
      function register() {
        const server = { get: function () {} }
        server.get("Home", function (req, res) { res.render("home") })
      }
      module.exports = register
    `,
    "sfcc/no-isml-rendering",
  )

  expect(messages).toHaveLength(0)
})

test("storefront boundary rules are not enabled in recommended", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/no-isml-rendering")
  expect(ruleIds).not.toContain("sfcc/no-pipeline-api")
  expect(ruleIds).not.toContain("sfcc/no-sfra-server")
})
