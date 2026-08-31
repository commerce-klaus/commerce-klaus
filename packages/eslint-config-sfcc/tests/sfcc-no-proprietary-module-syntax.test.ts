import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

type ProprietaryModuleSyntax = "star" | "superModule" | "tilde"

function lint(code: string, options?: { allow?: ProprietaryModuleSyntax[] }) {
  const linter = new Linter()
  return linter.verify(
    code,
    {
      languageOptions: { sourceType: "commonjs" },
      plugins: { sfcc },
      rules: {
        "sfcc/no-proprietary-module-syntax": ["error", ...(options ? [options] : [])],
      },
    },
    { filename: "cartridges/app_custom/cartridge/scripts/example.js" },
  )
}

test("reports all proprietary module syntax by default", () => {
  const messages = lint(`
    const inherited = require("*/cartridge/scripts/helper")
    const local = require("~/cartridge/scripts/helper")
    const superModule = module.superModule
    module.exports = { inherited, local, superModule }
  `)

  expect(messages.map((message) => message.messageId)).toEqual([
    "proprietaryRequirePath",
    "proprietaryRequirePath",
    "proprietarySuperModule",
  ])
})

test("allows configured proprietary module syntax", () => {
  const messages = lint(
    `
      const inherited = require("*/cartridge/scripts/helper")
      const local = require("~/cartridge/scripts/helper")
      const superModule = module.superModule
      module.exports = { inherited, local, superModule }
    `,
    { allow: ["star", "superModule"] },
  )

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain('"tilde"')
})

test("reports computed superModule access", () => {
  const messages = lint('const superModule = module["superModule"]')

  expect(messages).toHaveLength(1)
  expect(messages[0]?.messageId).toBe("proprietarySuperModule")
})

test("ignores superModule on a locally defined module object", () => {
  const messages = lint(`
    function getSuperModule(module) {
      return module.superModule
    }
    module.exports = getSuperModule
  `)

  expect(messages).toHaveLength(0)
})

test("allows standard and other SFCC require paths", () => {
  const messages = lint(`
    const relative = require("./helper")
    const platform = require("dw/order/OrderMgr")
    const cartridge = require("app_custom/cartridge/scripts/helper")
    const dynamic = require(moduleName)
    module.exports = { relative, platform, cartridge, dynamic }
  `)

  expect(messages).toHaveLength(0)
})

test("supports static template literal require paths", () => {
  const messages = lint("const helper = require(`*/cartridge/scripts/helper`)")

  expect(messages).toHaveLength(1)
  expect(messages[0]?.messageId).toBe("proprietaryRequirePath")
})

test("is not enabled in the recommended config", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/no-proprietary-module-syntax")
})
