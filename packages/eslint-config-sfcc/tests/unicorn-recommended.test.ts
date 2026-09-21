import unicorn from "eslint-plugin-unicorn"
import { expect, test, describe } from "vite-plus/test"

import { createRecommendedConfig } from "../src/index.js"
import { lintText } from "./test-utils.js"

const unicornRecommended = unicorn.configs.recommended
const sfccRecommended = createRecommendedConfig({
  files: ["**/*.{js,ts,ds}"],
  ignores: [],
})

async function lint(code: string, filename = "fixture.js") {
  const config = [
    ...(Array.isArray(unicornRecommended) ? unicornRecommended : [unicornRecommended]),
    ...sfccRecommended,
  ]
  return lintText(config, code, filename)
}

describe("unicorn:recommended config", () => {
  test.each([
    ["array reversal", "const reversed = [...values].reverse()", "unicorn/no-array-reverse"],
    ["array splicing", "const shortened = values.splice(0, 1)", "unicorn/no-array-splice"],
    [
      "last array match",
      "const result = values.filter(Boolean).pop()",
      "unicorn/prefer-array-find",
    ],
    [
      "string match iteration",
      "let match; while ((match = /x/g.exec(value))) consume(match)",
      "unicorn/prefer-string-match-all",
    ],
  ])("does not suggest unsupported %s APIs", async (_name, code, ruleId) => {
    const messages = await lint(code)

    expect(messages.some((message) => message.ruleId === ruleId)).toBe(false)
  })

  test("flags legacy underscore controller filename", async () => {
    const code = "module.exports = function handle() {}"
    const messages = await lint(code, "cartridges/app/cartridge/controllers/checkout_controller.js")
    expect(messages.some((m) => m.ruleId === "unicorn/filename-case")).toBe(true)
  })

  test("allows kebab-case controller filename", async () => {
    const code = "module.exports = function handle() {}"
    const messages = await lint(code, "cartridges/app/cartridge/controllers/checkout-controller.js")

    expect(messages.length).toBe(0)
  })

  test("flags legacy helper filename with underscores", async () => {
    const code = "module.exports = function mapProduct() {}"
    const messages = await lint(code, "cartridges/app/cartridge/scripts/product_detail_helper.js")
    expect(messages.some((m) => m.ruleId === "unicorn/filename-case")).toBe(true)
  })

  test("allows kebab-case helper filename", async () => {
    const code = "module.exports = function mapProduct() {}"
    const messages = await lint(code, "cartridges/app/cartridge/scripts/product-detail-helper.js")
    expect(messages.length).toBe(0)
  })
})
