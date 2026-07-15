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

const fixtureDir = fileURLToPath(new URL("./fixtures/no-string-equals-type-aware", import.meta.url))

async function lintTypeAware(filename: string) {
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
          "sfcc/no-string-equals": "error",
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

describe("sfcc/no-string-equals", () => {
  test("reports String.equals style member call", async () => {
    const result = await lint('customerNo.equals("123")')
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("reports literal-string equals call", async () => {
    const result = await lint('"foo".equals("bar")')
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("reports computed equals member call", async () => {
    const result = await lint('customerNo["equals"]("123")')
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("suggests strict equality replacement", async () => {
    const code = 'customerNo.equals("123")'
    const result = await lint(code)
    const hit = result?.messages.find((m) => m.ruleId === "sfcc/no-string-equals")
    const suggestion = hit?.suggestions?.[0]

    expect(suggestion?.desc).toContain('customerNo === "123"')
    expect(applySuggestion(code, suggestion as { fix?: any })).toBe('customerNo === "123"')
  })

  test("allows strict equality", async () => {
    const result = await lint('customerNo === "123"')
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(false)
  })

  test("uses TS type info to ignore non-string equals calls", async () => {
    const result = await lintTypeAware("non-string-equals.ts")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(false)
  })

  test("uses TS type info to keep reporting string equals with augmentation", async () => {
    const result = await lintTypeAware("string-augmentation-equals.ts")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("uses TS type info to keep reporting string equals with type aliases", async () => {
    const result = await lintTypeAware("string-alias-equals.ts")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("uses TS type info to keep reporting equals on string literal unions", async () => {
    const result = await lintTypeAware("string-literal-union-equals.ts")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("uses TS type info to keep reporting equals on alias-based string literal unions", async () => {
    const result = await lintTypeAware("string-literal-union-alias-equals.ts")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })

  test("uses TS type info conservatively for mixed string and non-string unions", async () => {
    const result = await lintTypeAware("mixed-string-and-object-union-equals.ts")
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(false)
  })

  test("keeps fallback behavior without TS parser type info", async () => {
    const result = await lint('const value = "abc"\nvalue.equals("123")')
    const messages = result?.messages ?? []

    expect(messages.some((m) => m.ruleId === "sfcc/no-string-equals")).toBe(true)
  })
})
