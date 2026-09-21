import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"

const filename = "cartridges/app_sfra/cartridge/scripts/example.js"

function lint(code: string): Linter.LintMessage[] {
  return new Linter().verify(code, recommended, { filename })
}

function fix(code: string): Linter.FixReport {
  return new Linter().verifyAndFix(code, recommended, { filename })
}

test("reports String.raw tagged templates and direct calls", () => {
  const messages = lint(`
    const first = String.raw\`line1\\nline2\`
    const second = String.raw({ raw: ["value"] })
    const third = String["raw"]\`value\`
  `)

  expect(messages.filter((message) => message.ruleId === "sfcc/no-string-raw")).toHaveLength(3)
})

test("fixes a static String.raw template to an equivalent string literal", () => {
  const result = fix("const value = String.raw`line1\\nline2`")

  expect(result.fixed).toBe(true)
  expect(result.output).toBe('const value = "line1\\\\nline2"')
})

test("does not auto-fix interpolated templates or direct calls", () => {
  const code = [
    "const first = String.raw`prefix ${value}`",
    'const second = String.raw({ raw: ["value"] })',
  ].join("\n")
  const result = fix(code)

  expect(result.fixed).toBe(false)
  expect(result.output).toBe(code)
})

test("ignores shadowed String bindings and unrelated raw properties", () => {
  const messages = lint(`
    function example(String) {
      return String.raw\`value\`
    }
    const helper = { raw: function () { return "value" } }
    helper.raw()
  `)

  expect(messages.some((message) => message.ruleId === "sfcc/no-string-raw")).toBe(false)
})
