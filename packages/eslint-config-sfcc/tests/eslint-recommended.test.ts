import js from "@eslint/js"
import globals from "globals"
import { expect, test, describe } from "vite-plus/test"

import { createRecommendedConfig } from "../src/index.js"
import { lintText } from "./test-utils.js"

const eslintRecommended = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  ...createRecommendedConfig({
    files: ["**/*.{js,ts,ds}"],
    ignores: [],
  }),
]

async function lint(code: string, filename = "fixture.js") {
  return lintText(eslintRecommended, code, filename)
}

describe("eslint:recommended config", () => {
  test("does not expose Node.js or browser globals", async () => {
    const messages = await lint("process.cwd(); window.location.href")

    expect(
      messages.filter((message) => message.ruleId === "no-undef").map(({ message }) => message),
    ).toEqual(["'process' is not defined.", "'window' is not defined."])
  })

  test("flags undefined symbol in business logic", async () => {
    const code = `
      const Logger = require("dw/system/Logger")
      function calculateTax(total) {
        return total * TAX_RATE
      }
      Logger.info(calculateTax(100))
    `
    const messages = await lint(code)
    expect(messages.some((m) => m.ruleId === "no-undef")).toBe(true)
  })

  test("allows defined constants and usage", async () => {
    const code = `
      const Logger = require("dw/system/Logger")
      const TAX_RATE = 0.19
      function calculateTax(total) {
        return total * TAX_RATE
      }
      Logger.info(calculateTax(100))
    `
    const messages = await lint(code)
    expect(messages.length).toBe(0)
  })

  test("flags assignment in condition", async () => {
    const code = `
      const Logger = require("dw/system/Logger")
      function shouldRenderPromo(customer) {
        let isAuthenticated = false
        if (isAuthenticated = customer.authenticated) {
          return true
        }
        return false
      }
      Logger.info(shouldRenderPromo({ authenticated: true }))
    `
    const messages = await lint(code)
    expect(messages.some((m) => m.ruleId === "no-cond-assign")).toBe(true)
  })

  test("allows safe condition check", async () => {
    const code = `
      const Logger = require("dw/system/Logger")
      function shouldRenderPromo(customer) {
        const isAuthenticated = customer.authenticated === true
        if (isAuthenticated) {
          return true
        }
        return false
      }
      Logger.info(shouldRenderPromo({ authenticated: true }))
    `
    const messages = await lint(code)
    expect(messages.length).toBe(0)
  })
})
