import tseslint from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import { ESLint, type Linter } from "eslint"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { createRecommendedConfig } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

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

const fixtureDir = fileURLToPath(new URL("./fixtures/no-empty-global-type-aware", import.meta.url))

async function lintTypeAwareFixture(filename: string) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            project: [path.join(fixtureDir, "tsconfig.json")],
          },
        },
        plugins: {
          sfcc,
        },
        rules: {
          "sfcc/no-empty-global": "error",
        },
      },
    ],
  })

  const results = await eslint.lintFiles([path.join(fixtureDir, filename)])
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
    const code = "empty(customer)"
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestions = hit?.suggestions ?? []

    expect(suggestions.length).toBeGreaterThanOrEqual(4)
    expect(suggestions.some((s) => s.desc?.includes("!customer"))).toBe(true)
    expect(suggestions.some((s) => s.desc?.includes("customer.length === 0"))).toBe(true)
    expect(suggestions.some((s) => s.desc?.includes("Object.keys(customer).length === 0"))).toBe(
      true,
    )
    expect(suggestions.some((s) => s.desc?.includes("customer.isEmpty()"))).toBe(true)

    const nullableSuggestion = suggestions.find((s) => s.desc?.includes("!customer"))
    expect(applySuggestion(code, nullableSuggestion as { fix?: any })).toBe("!customer")
  })

  test("offers suggestions for member expression arguments", async () => {
    const code = "empty(customer.profile.email)"
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestions = hit?.suggestions ?? []

    expect(suggestions.length).toBeGreaterThanOrEqual(4)
    expect(suggestions.some((s) => s.desc?.includes("!customer.profile.email"))).toBe(true)
    expect(suggestions.some((s) => s.desc?.includes("customer.profile.email.length === 0"))).toBe(
      true,
    )
    expect(
      suggestions.some((s) => s.desc?.includes("Object.keys(customer.profile.email).length === 0")),
    ).toBe(true)
    expect(suggestions.some((s) => s.desc?.includes("customer.profile.email.isEmpty()"))).toBe(true)

    const nullableSuggestion = suggestions.find((s) => s.desc?.includes("!customer.profile.email"))
    expect(applySuggestion(code, nullableSuggestion as { fix?: any })).toBe(
      "!customer.profile.email",
    )

    const lengthSuggestion = suggestions.find((s) =>
      s.desc?.includes("customer.profile.email.length === 0"),
    )
    expect(applySuggestion(code, lengthSuggestion as { fix?: any })).toBe(
      "customer.profile.email.length === 0",
    )
  })

  test("does not report for locally shadowed empty function", async () => {
    const result = await lint("function empty(value) { return !value }\nempty(customer)")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-empty-global")).toBe(false)
  })

  test("does not report for parameter shadowing", async () => {
    const result = await lint("function check(empty) { return empty(customer) }")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-empty-global")).toBe(false)
  })

  test("uses type info fixture to suggest only Object.keys for Record values", async () => {
    const result = await lintTypeAwareFixture("record.ts")
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestions = hit?.suggestions ?? []

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.desc).toContain("Object.keys(customer).length === 0")
  })

  test("uses type info fixture to suggest only length for string values", async () => {
    const result = await lintTypeAwareFixture("string.ts")
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-empty-global")
    const suggestions = hit?.suggestions ?? []

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.desc).toContain("customer.length === 0")
  })
})
