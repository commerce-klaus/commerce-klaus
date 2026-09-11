import { describe, expect, test } from "vite-plus/test"

import { createTypeScriptRecommendedConfig, lintText } from "./test-utils.js"

const config = createTypeScriptRecommendedConfig(["**/*.js"])

async function lint(code: string, filename = "cartridges/app_sfra/cartridge/scripts/fixture.js") {
  return lintText(config, code, filename)
}

describe("sfcc/no-rhino-import-globals", () => {
  test("reports importScript usage", async () => {
    const messages = await lint('importScript("scripts/util");')

    expect(messages.some((m) => m.ruleId === "sfcc/no-rhino-import-globals")).toBe(true)
  })

  test("reports importPackage usage", async () => {
    const messages = await lint('importPackage("dw.catalog")')

    expect(messages.some((m) => m.ruleId === "sfcc/no-rhino-import-globals")).toBe(true)
  })

  test("reports importClass usage", async () => {
    const messages = await lint("importClass(Packages.java.lang.String)")

    expect(messages.some((m) => m.ruleId === "sfcc/no-rhino-import-globals")).toBe(true)
  })

  test("allows CommonJS require", async () => {
    const messages = await lint('const Logger = require("dw/system/Logger")')

    expect(messages.some((m) => m.ruleId === "sfcc/no-rhino-import-globals")).toBe(false)
  })
})
