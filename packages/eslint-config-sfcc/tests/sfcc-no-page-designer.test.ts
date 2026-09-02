import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { configs, recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function lint(code: string) {
  return new Linter().verify(code, {
    languageOptions: { sourceType: "commonjs" },
    plugins: { sfcc },
    rules: { "sfcc/no-page-designer": "error" },
  })
}

test.each([
  "require('dw/experience/PageMgr')",
  "require(`dw/experience/Component`)",
  "import('dw/experience/image/Image')",
  "import('dw/experience/cms/CMSRecord')",
])("reports Page Designer API access through %s", (code) => {
  expect(lint(code).map((message) => message.messageId)).toEqual(["pageDesignerApi"])
})

test.each([
  "require('dw/content/ContentMgr')",
  "require('dw/experience')",
  "require('./dw/experience/PageMgr')",
  "require('app_custom/dw/experience/PageMgr')",
])("allows non-Page Designer module %s", (code) => {
  expect(lint(code)).toHaveLength(0)
})

test("ignores dynamic module paths", () => {
  expect(lint("require(modulePath)")).toHaveLength(0)
})

test("is not enabled in recommended or storefront presets", () => {
  const ruleIds = Object.values(configs).flatMap((preset) =>
    preset.flatMap((config) => Object.keys(config.rules ?? {})),
  )

  expect(ruleIds).not.toContain("sfcc/no-page-designer")
  expect(recommended).toBe(configs.recommended)
})
