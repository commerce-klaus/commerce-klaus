import tseslint from "@typescript-eslint/eslint-plugin"
import { ESLint, type Linter } from "eslint"
import { describe, expect, test } from "vite-plus/test"

import { createRecommendedConfig } from "../src/index.js"

const tsRecommended = tseslint.configs["flat/recommended"] as unknown as
  | Linter.Config
  | Linter.Config[]

const config: Linter.Config[] = [
  ...(Array.isArray(tsRecommended) ? tsRecommended : [tsRecommended]),
  ...createRecommendedConfig({
    files: ["**/*.js"],
    ignores: [],
  }),
]

async function lint(code: string, filename = "cartridges/app_sfra/cartridge/scripts/fixture.js") {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  })

  const results = await eslint.lintText(code, { filePath: filename })
  return results[0]
}

function applySuggestion(code: string, suggestion: { fix?: any }): string {
  const fixes = Array.isArray(suggestion.fix)
    ? [...suggestion.fix]
    : suggestion.fix
      ? [suggestion.fix]
      : []

  return fixes
    .sort((left, right) => right.range[0] - left.range[0])
    .reduce((output, fix) => {
      return `${output.slice(0, fix.range[0])}${fix.text}${output.slice(fix.range[1])}`
    }, code)
}

describe("sfcc/no-empty-global", () => {
  test("reports empty() usage", async () => {
    const result = await lint("empty(customer)")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-empty-global")).toBe(true)
  })

  test("suggests a length check for strings", async () => {
    const code = 'empty("foo")'
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestion = hit?.suggestions?.[0]

    expect(suggestion?.desc).toContain("length")
    expect(applySuggestion(code, suggestion as { fix?: any })).toBe('"foo".length === 0')
  })

  test("suggests a length check for arrays", async () => {
    const code = "empty([])"
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestion = hit?.suggestions?.[0]

    expect(suggestion?.desc).toContain("length")
    expect(applySuggestion(code, suggestion as { fix?: any })).toBe("[].length === 0")
  })

  test("suggests Object.keys for plain objects", async () => {
    const code = "empty({ foo: 1 })"
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestion = hit?.suggestions?.[0]

    expect(suggestion?.desc).toContain("plain objects")
    expect(applySuggestion(code, suggestion as { fix?: any })).toBe(
      "Object.keys({ foo: 1 }).length === 0",
    )
  })

  test("suggests isEmpty for SFCC collections", async () => {
    const code = "empty(new ArrayList())"
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestion = hit?.suggestions?.[0]

    expect(suggestion?.desc).toContain("collections")
    expect(applySuggestion(code, suggestion as { fix?: any })).toBe("new ArrayList().isEmpty()")
  })

  test("offers suggestions for identifier arguments", async () => {
    const result = await lint("empty(customer)")
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestions = hit?.suggestions ?? []

    expect(suggestions.length).toBeGreaterThanOrEqual(3)
    expect(suggestions.some((s) => s.desc?.includes("customer.length === 0"))).toBe(true)
    expect(suggestions.some((s) => s.desc?.includes("Object.keys(customer).length === 0"))).toBe(
      true,
    )
    expect(suggestions.some((s) => s.desc?.includes("customer.isEmpty()"))).toBe(true)
  })

  test("offers suggestions for member expression arguments", async () => {
    const code = "empty(customer.profile.email)"
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestions = hit?.suggestions ?? []

    expect(suggestions.length).toBeGreaterThanOrEqual(3)
    expect(suggestions.some((s) => s.desc?.includes("customer.profile.email.length === 0"))).toBe(
      true,
    )
    expect(
      suggestions.some((s) => s.desc?.includes("Object.keys(customer.profile.email).length === 0")),
    ).toBe(true)
    expect(suggestions.some((s) => s.desc?.includes("customer.profile.email.isEmpty()"))).toBe(true)

    const lengthSuggestion = suggestions.find((s) =>
      s.desc?.includes("customer.profile.email.length === 0"),
    )
    expect(applySuggestion(code, lengthSuggestion as { fix?: any })).toBe(
      "customer.profile.email.length === 0",
    )
  })
})
