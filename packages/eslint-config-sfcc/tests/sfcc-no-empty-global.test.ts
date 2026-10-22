import tsParser from "@typescript-eslint/parser"
import { ESLint } from "eslint"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import sfcc from "../src/plugins/sfcc/index.js"
import { applySuggestion, createTypeScriptRecommendedConfig } from "./test-utils.js"

const config = createTypeScriptRecommendedConfig(["**/*.js"])
const fixtureDir = fileURLToPath(new URL("./fixtures/no-empty-global-type-aware", import.meta.url))
const typeAwareEslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.js"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          project: [path.join(fixtureDir, "tsconfig.json")],
        },
      },
      plugins: { sfcc },
      rules: {
        "sfcc/no-ambiguous-empty": "warn",
        "sfcc/prefer-explicit-empty-check": "warn",
      },
    },
  ],
})

async function lint(code: string, filename = "cartridges/app_sfra/cartridge/scripts/fixture.js") {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  })

  const results = await eslint.lintText(code, { filePath: filename })
  return results[0]
}

async function lintStrict(code: string) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.js"],
        plugins: { sfcc },
        rules: {
          "sfcc/no-empty-global": "error",
        },
      },
    ],
  })

  const results = await eslint.lintText(code, { filePath: "fixture.js" })
  return results[0]
}

async function lintWithAutofix(code: string) {
  const eslint = new ESLint({
    fix: true,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.js"],
        plugins: { sfcc },
        rules: {
          "sfcc/prefer-explicit-empty-check": ["error", { autofix: true }],
        },
      },
    ],
  })

  const results = await eslint.lintText(code, { filePath: "fixture.js" })
  return results[0]
}

async function lintTypeAwareFixture(filename: string) {
  const results = await typeAwareEslint.lintFiles([path.join(fixtureDir, filename)])
  return results[0]
}

function findMessage(result: Awaited<ReturnType<typeof lint>> | undefined, ruleId: string) {
  return result?.messages.find((message) => message.ruleId === ruleId)
}

function applyFirstSuggestion(code: string, message: ReturnType<typeof findMessage>): string {
  return applySuggestion(code, message?.suggestions?.[0] as { fix?: any })
}

describe("SFCC empty() migration rules", () => {
  test("offers one behavior-preserving replacement for a string", async () => {
    const code = 'empty("foo")'
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.severity).toBe(1)
    expect(hit?.suggestions).toHaveLength(1)
    expect(applyFirstSuggestion(code, hit)).toBe('"foo".length === 0')
    expect(findMessage(result, "sfcc/no-ambiguous-empty")).toBeUndefined()
  })

  test("offers one behavior-preserving replacement for an array", async () => {
    const code = "empty([])"
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toBe("[].length === 0")
  })

  test("autofixes a known value only when explicitly enabled", async () => {
    const result = await lintWithAutofix('const value = ""\nempty(value)')

    expect(result?.output).toBe('const value = ""\nvalue.length === 0')
    expect(result?.messages).toHaveLength(0)
  })

  test("preserves expression precedence when autofixing", async () => {
    const result = await lintWithAutofix('const value = ""\n!empty(value)')

    expect(result?.output).toBe('const value = ""\n!(value.length === 0)')
  })

  test("groups nullable replacements inside logical expressions", async () => {
    const result = await lintWithAutofix(
      [
        "/** @type {string | null | undefined} */",
        "const value = getValue()",
        "empty(value) && consume()",
      ].join("\n"),
    )

    expect(result?.output).toContain(
      "(value === null || value === undefined || value.length === 0) && consume()",
    )
  })

  test("does not autofix when replacement would discard side effects", async () => {
    const code = "empty({ value: getValue() })"
    const result = await lintWithAutofix(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(result?.output).toBeUndefined()
    expect(hit?.suggestions).toHaveLength(1)
    expect(applyFirstSuggestion(code, hit)).toBe("false")
  })

  test("infers a constant string initializer without type services", async () => {
    const code = 'const value = ""\nempty(value)'
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toContain("value.length === 0")
  })

  test("does not infer a mutable string binding after reassignment", async () => {
    const code = 'let value = ""\nvalue = customer\nempty(value)'
    const result = await lint(code)

    expect(findMessage(result, "sfcc/no-ambiguous-empty")).toBeDefined()
    expect(findMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
  })

  test("uses a parameter JSDoc type without parser services", async () => {
    const code = [
      "/**",
      " * @param {string|null|undefined} value",
      " */",
      "function check(value) { return empty(value) }",
    ].join("\n")
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toContain(
      "value === null || value === undefined || value.length === 0",
    )
  })

  test("uses a variable JSDoc collection type without parser services", async () => {
    const code = [
      "/** @type {dw.util.Collection|null} */",
      "const values = getValues()",
      "empty(values)",
    ].join("\n")
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toContain(
      "values === null || values === undefined || values.isEmpty()",
    )
  })

  test("keeps wildcard JSDoc parameters ambiguous", async () => {
    const code = ["/** @param {*} value */", "function check(value) { return empty(value) }"].join(
      "\n",
    )
    const result = await lint(code)

    expect(findMessage(result, "sfcc/no-ambiguous-empty")).toBeDefined()
    expect(findMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
  })

  test("does not treat an empty plain object as SFCC-empty", async () => {
    const code = "empty({})"
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toBe("false")
  })

  test("recognizes null as always SFCC-empty", async () => {
    const code = "empty(null)"
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toBe("true")
  })

  test("offers isEmpty for a non-null SFCC collection", async () => {
    const code = "empty(new ArrayList())"
    const result = await lint(code)
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toBe("new ArrayList().isEmpty()")
  })

  test("does not confuse a native Set with an SFCC collection", async () => {
    const result = await lint("empty(new Set())")

    expect(findMessage(result, "sfcc/no-ambiguous-empty")).toBeDefined()
    expect(findMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
  })

  test("asks for type information instead of speculating", async () => {
    const result = await lint("empty(customer)")
    const hit = findMessage(result, "sfcc/no-ambiguous-empty")

    expect(hit?.severity).toBe(1)
    expect(hit?.message).toContain("Add or narrow its JSDoc type")
    expect(hit?.suggestions).toBeUndefined()
    expect(findMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
  })

  test("reports empty calls without an argument as ambiguous", async () => {
    const result = await lint("empty()")
    const hit = findMessage(result, "sfcc/no-ambiguous-empty")

    expect(hit?.message).toContain("value type is unknown")
  })

  test("does not report locally shadowed empty functions", async () => {
    const result = await lint("function empty(value) { return !value }\nempty(customer)")
    const ruleIds = result?.messages.map((message) => message.ruleId)

    expect(ruleIds).not.toContain("sfcc/no-ambiguous-empty")
    expect(ruleIds).not.toContain("sfcc/prefer-explicit-empty-check")
  })

  test("keeps a strict opt-in rule for banning every global empty call", async () => {
    const result = await lintStrict("empty(customer)")
    const hit = findMessage(result, "sfcc/no-empty-global")

    expect(hit?.severity).toBe(2)
    expect(hit?.message).toContain("SFCC-specific global")
  })

  test("strict rule still offers a safe replacement for a known type", async () => {
    const code = 'empty("sample")'
    const result = await lintStrict(code)
    const hit = findMessage(result, "sfcc/no-empty-global")

    expect(applyFirstSuggestion(code, hit)).toBe('"sample".length === 0')
  })

  test("strict rule ignores locally shadowed empty functions", async () => {
    const result = await lintStrict("function empty(value) { return !value }\nempty(customer)")

    expect(findMessage(result, "sfcc/no-empty-global")).toBeUndefined()
  })

  test("replaces a typed string with a length check", async () => {
    const result = await lintTypeAwareFixture("string.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions).toHaveLength(1)
    expect(hit?.suggestions?.[0]?.desc).toContain("customer.length === 0")
  })

  test("preserves null and undefined semantics for nullable strings", async () => {
    const code = await fs.readFile(path.join(fixtureDir, "nullable-string.js"), "utf8")
    const result = await lintTypeAwareFixture("nullable-string.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(applyFirstSuggestion(code, hit)).toContain(
      "customer === null || customer === undefined || customer.length === 0",
    )
  })

  test("preserves null and undefined semantics for nullable arrays", async () => {
    const result = await lintTypeAwareFixture("nullable-array.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain(
      "customer === null || customer === undefined || customer.length === 0",
    )
  })

  test("preserves null and undefined semantics for nullable collections", async () => {
    const result = await lintTypeAwareFixture("nullable-collection.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain(
      "customer === null || customer === undefined || customer.isEmpty()",
    )
  })

  test("replaces a non-null Record check with false", async () => {
    const result = await lintTypeAwareFixture("record.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain("false")
  })

  test("replaces a nullable object reference with an explicit nullish check", async () => {
    const result = await lintTypeAwareFixture("nullable-product.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain("customer === null || customer === undefined")
  })

  test("recognizes unions of plain object shapes as nullish-only checks", async () => {
    const result = await lintTypeAwareFixture("object-record-union-alias.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain("false")
  })

  test("reports mixed string and object unions as ambiguous", async () => {
    const result = await lintTypeAwareFixture("union-string-object.js")
    const hit = findMessage(result, "sfcc/no-ambiguous-empty")

    expect(hit?.message).toContain("different SFCC empty semantics")
    expect(findMessage(result, "sfcc/prefer-explicit-empty-check")).toBeUndefined()
  })

  test("recognizes alias-based string literal unions", async () => {
    const result = await lintTypeAwareFixture("string-literal-union-alias.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain("customer.length === 0")
  })

  test("recognizes null and undefined unions as always empty", async () => {
    const result = await lintTypeAwareFixture("nullable-union-alias.js")
    const hit = findMessage(result, "sfcc/prefer-explicit-empty-check")

    expect(hit?.suggestions?.[0]?.desc).toContain("true")
  })
})
