import { ESLint, type Linter } from "eslint"
import { describe, expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

const config: Linter.Config[] = [
  {
    files: ["**/*.js"],
    plugins: { sfcc },
    rules: { "sfcc/no-controllers": "error" },
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

describe("sfcc/no-controllers", () => {
  test.each([
    "cartridges/app_sfra/cartridge/controllers/Home.js",
    "C:\\project\\cartridges\\app_sfra\\cartridge\\controllers\\Home.js",
  ])("reports controller file %s", async (filename) => {
    const messages = await lint(filename)

    expect(messages.some((message) => message.ruleId === "sfcc/no-controllers")).toBe(true)
  })

  test.each([
    "cartridges/app_sfra/cartridge/scripts/Home.js",
    "cartridges/app_sfra/cartridge/controllers.js",
    "cartridges/app_sfra/cartridge/controllers-legacy/Home.js",
  ])("does not report non-controller file %s", async (filename) => {
    const messages = await lint(filename)

    expect(messages.some((message) => message.ruleId === "sfcc/no-controllers")).toBe(false)
  })

  test("is not enabled in the recommended config", () => {
    const ruleIds = recommended.flatMap((recommendedConfig) =>
      Object.keys(recommendedConfig.rules ?? {}),
    )

    expect(ruleIds).not.toContain("sfcc/no-controllers")
  })
})
