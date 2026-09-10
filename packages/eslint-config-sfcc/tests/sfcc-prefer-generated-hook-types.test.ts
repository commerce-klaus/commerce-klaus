import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { sfcc } from "../src/index.js"

function withHook<T>(run: (filename: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-generated-hook-types-test-"))
  const previousCwd = process.cwd()
  const cartridgeRoot = path.join(tempDir, "cartridges", "app_custom")
  const filename = "cartridges/app_custom/cartridge/scripts/hooks/calculate.js"
  const absoluteFilename = path.join(tempDir, filename)
  fs.mkdirSync(path.dirname(absoluteFilename), { recursive: true })
  fs.writeFileSync(absoluteFilename, "")
  fs.writeFileSync(
    path.join(cartridgeRoot, "package.json"),
    JSON.stringify({ hooks: "./cartridge/scripts/hooks.json" }),
  )
  fs.writeFileSync(
    path.join(cartridgeRoot, "cartridge", "scripts", "hooks.json"),
    JSON.stringify({
      hooks: [{ name: "dw.order.calculate", script: "./hooks/calculate" }],
    }),
  )

  try {
    process.chdir(tempDir)
    return run(filename)
  } finally {
    process.chdir(previousCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function lint(code: string, filename: string) {
  return new Linter().verify(
    code,
    [{ plugins: { sfcc }, rules: { "sfcc/prefer-generated-hook-types": "error" } }],
    { filename },
  )
}

function applySuggestion(
  code: string,
  suggestion: { fix?: { range: [number, number]; text: string } },
) {
  const fix = suggestion.fix
  return fix ? `${code.slice(0, fix.range[0])}${fix.text}${code.slice(fix.range[1])}` : code
}

test("suggests the generated type for a registered hook function", () => {
  withHook((filename) => {
    const code = "function calculate() {}\nexports.calculate = calculate\n"
    const [message] = lint(code, filename)

    expect(message?.ruleId).toBe("sfcc/prefer-generated-hook-types")
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      "/** @type {SfccHooks.OrderCalculate} */\nfunction calculate()",
    )
  })
})

test("replaces a broad registered hook type", () => {
  withHook((filename) => {
    const code = "/** @type {Function} */\nfunction calculate() {}\nexports.calculate = calculate\n"
    const [message] = lint(code, filename)

    expect(message?.message).toContain('uses "Function" instead')
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      "@type {SfccHooks.OrderCalculate}",
    )
  })
})

test("allows the matching generated hook type", () => {
  withHook((filename) => {
    const code = [
      "/** @type {SfccHooks.OrderCalculate} */",
      "function calculate() {}",
      "exports.calculate = calculate",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("ignores project-specific hooks without a generated system alias", () => {
  withHook((filename) => {
    const hooksPath = path.resolve(filename, "../../../hooks.json")
    fs.writeFileSync(
      hooksPath,
      JSON.stringify({ hooks: [{ name: "app.example.provider", script: "./hooks/calculate" }] }),
    )

    expect(lint("exports.provider = function () {}\n", filename)).toEqual([])
  })
})
