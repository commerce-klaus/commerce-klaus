import { describe, expect, test } from "vite-plus/test"

import { createTypeScriptRecommendedConfig, lintText } from "./test-utils.js"

const config = createTypeScriptRecommendedConfig(["**/*.{js,ds}"])

describe("sfcc/no-ds-files", () => {
  test("reports .ds files", async () => {
    const messages = await lintText(
      config,
      "const Logger = require('dw/system/Logger'); Logger.info('ok')",
      "cartridges/app_sfra/cartridge/scripts/legacy.ds",
    )

    expect(messages.some((m) => m.ruleId === "sfcc/no-ds-files")).toBe(true)
  })

  test("does not report .js files", async () => {
    const messages = await lintText(
      config,
      "const Logger = require('dw/system/Logger'); Logger.info('ok')",
      "cartridges/app_sfra/cartridge/scripts/current.js",
    )

    expect(messages.some((m) => m.ruleId === "sfcc/no-ds-files")).toBe(false)
  })
})
