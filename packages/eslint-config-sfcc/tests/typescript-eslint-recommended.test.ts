import { expect, test, describe } from "vite-plus/test"

import { createTypeScriptRecommendedConfig, lintText } from "./test-utils.js"

const tsRecommendedConfig = createTypeScriptRecommendedConfig(["**/*.js"])

async function lint(code: string, filename = "fixture.js") {
  return lintText(tsRecommendedConfig, code, filename)
}

describe("@typescript-eslint:recommended config", () => {
  test("flags unused request payload variable", async () => {
    const code = `
      const Logger = require("dw/system/Logger")
      /**
       * @param {{ productID: string }} body
       */
      function buildContext(body) {
        const locale = "de_DE"
        return { locale }
      }
      Logger.info(JSON.stringify(buildContext({ productID: "123" })))
    `
    const messages = await lint(code)
    expect(messages.some((m) => m.ruleId === "@typescript-eslint/no-unused-vars")).toBe(true)
  })

  test("allows used request payload variable", async () => {
    const code = `
      const Logger = require("dw/system/Logger")
      /**
       * @param {{ productID: string }} body
       */
      function buildContext(body) {
        const locale = "de_DE"
        return { locale, productID: body.productID }
      }
      Logger.info(JSON.stringify(buildContext({ productID: "123" })))
    `
    const messages = await lint(code)
    expect(messages.length).toBe(0)
  })
})
