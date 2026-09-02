import { ESLint, type Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { configs } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

const config: Linter.Config[] = [
  {
    files: ["**/*.js"],
    plugins: { sfcc },
    rules: { "sfcc/no-custom-api": "error" },
  },
]

async function lint(filename: string) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  })
  const results = await eslint.lintText("module.exports = {}", { filePath: filename })
  return results[0]?.messages ?? []
}

test.each([
  "cartridges/app_api/cartridge/rest-apis/loyalty/script.js",
  "C:\\project\\cartridges\\app_api\\cartridge\\rest-apis\\loyalty\\script.js",
])("reports Custom API file %s", async (filename) => {
  const messages = await lint(filename)

  expect(messages.map((message) => message.messageId)).toEqual(["customApi"])
})

test.each([
  "cartridges/app_api/cartridge/scripts/rest-apis/loyalty.js",
  "cartridges/app_api/cartridge/rest-apis.js",
  "cartridges/app_api/cartridge/rest-apis-legacy/loyalty/script.js",
  "cartridges/app_api/cartridge/controllers/Api.js",
])("allows non-Custom API file %s", async (filename) => {
  expect(await lint(filename)).toHaveLength(0)
})

test("is not enabled in recommended or storefront presets", () => {
  const ruleIds = Object.values(configs).flatMap((preset) =>
    preset.flatMap((presetConfig) => Object.keys(presetConfig.rules ?? {})),
  )

  expect(ruleIds).not.toContain("sfcc/no-custom-api")
})
