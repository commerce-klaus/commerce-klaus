import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function lint(code: string, allow?: string[]) {
  const linter = new Linter()
  return linter.verify(code, {
    languageOptions: { sourceType: "commonjs" },
    plugins: { sfcc },
    rules: {
      "sfcc/no-dw-api": ["error", ...(allow ? [{ allow }] : [])],
    },
  })
}

test.each([
  "require('dw/system/Transaction')",
  "require(`dw/order/OrderMgr`)",
  "import('dw/value/Money')",
])("reports SFCC API access through %s", (code) => {
  const messages = lint(code)

  expect(messages.map((message) => message.messageId)).toEqual(["dwApi"])
})

test.each(["require('./dw/helper')", "require('app_custom/dw/helper')", "import('server')"])(
  "allows non-dw module %s",
  (code) => {
    expect(lint(code)).toHaveLength(0)
  },
)

test("allows an exact module", () => {
  const messages = lint(
    `
      const Money = require("dw/value/Money")
      const Decimal = require("dw/util/Decimal")
      module.exports = { Money, Decimal }
    `,
    ["dw/value/Money"],
  )

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("dw/util/Decimal")
})

test("allows a module namespace ending in /*", () => {
  const messages = lint(
    `
      const Decimal = require("dw/util/Decimal")
      const ArrayList = require("dw/util/ArrayList")
      const Money = require("dw/value/Money")
      module.exports = { Decimal, ArrayList, Money }
    `,
    ["dw/util/*"],
  )

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("dw/value/Money")
})

test("does not treat an ordinary allow entry as a prefix", () => {
  expect(lint("require('dw/util/Decimal')", ["dw/util"])).toHaveLength(1)
})

test("ignores dynamic module paths", () => {
  expect(lint("require(modulePath)")).toHaveLength(0)
})

test("is not enabled in recommended", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/no-dw-api")
})
