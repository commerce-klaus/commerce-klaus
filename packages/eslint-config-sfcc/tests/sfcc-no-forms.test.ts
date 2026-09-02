import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function lint(code: string) {
  return new Linter().verify(code, {
    languageOptions: { sourceType: "commonjs" },
    plugins: { sfcc },
    rules: { "sfcc/no-forms": "error" },
  })
}

test.each([
  "require('dw/web/Form')",
  "require('dw/web/FormElement')",
  "require(`dw/web/Forms`)",
  "import('dw/web/FormField')",
])("reports form module access through %s", (code) => {
  expect(lint(code).map((message) => message.messageId)).toEqual(["formModule"])
})

test.each([
  "require('dw/web/URLAction')",
  "require('dw/web/Format')",
  "require('./Form')",
  "require('app_custom/Form')",
])("allows non-form module %s", (code) => {
  expect(lint(code)).toHaveLength(0)
})

test.each(['server.forms.getForm("profile")', 'server["forms"].getForm("profile")'])(
  "reports SFRA forms access through %s",
  (formsAccess) => {
    const messages = lint(`
    const server = require("server")
    const form = ${formsAccess}
    module.exports = form
  `)

    expect(messages.map((message) => message.messageId)).toEqual(["sfraForms"])
  },
)

test("supports an aliased SFRA server binding", () => {
  const messages = lint(`
    const router = require("server")
    module.exports = router.forms.getForm("profile")
  `)

  expect(messages.map((message) => message.messageId)).toEqual(["sfraForms"])
})

test("ignores unrelated forms properties", () => {
  const messages = lint(`
    const server = { forms: { getForm: function () {} } }
    const app = { forms: {} }
    server.forms.getForm("profile")
    module.exports = app.forms
  `)

  expect(messages).toHaveLength(0)
})

test("ignores a shadowed server binding", () => {
  const messages = lint(`
    const server = require("server")
    function getForm() {
      const server = { forms: { getForm: function () {} } }
      return server.forms.getForm("profile")
    }
    module.exports = getForm
  `)

  expect(messages).toHaveLength(0)
})

test("ignores dynamic module paths", () => {
  expect(lint("require(modulePath)")).toHaveLength(0)
})

test("is not enabled in recommended", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/no-forms")
})
