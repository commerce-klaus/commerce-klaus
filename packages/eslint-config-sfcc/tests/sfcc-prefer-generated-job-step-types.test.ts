import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { sfcc } from "../src/index.js"

function withJobStep<T>(run: (filename: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-generated-job-types-test-"))
  const previousCwd = process.cwd()
  const cartridgesDir = path.join(tempDir, "cartridges")
  const cartridgeRoot = path.join(cartridgesDir, "app_jobs")
  const filename = "cartridges/app_jobs/cartridge/scripts/jobs/feed.js"
  const absoluteFilename = path.join(tempDir, filename)
  fs.mkdirSync(path.dirname(absoluteFilename), { recursive: true })
  fs.writeFileSync(absoluteFilename, "")
  fs.writeFileSync(
    path.join(cartridgeRoot, "steptypes.json"),
    JSON.stringify({
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.GenerateFeed",
            function: "run",
            module: "app_jobs/cartridge/scripts/jobs/feed",
          },
        ],
      },
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
  const linter = new Linter()
  return linter.verify(
    code,
    [
      {
        files: ["**/*.js"],
        plugins: { sfcc },
        settings: { sfcc: { cartridgesDir: "cartridges" } },
        rules: { "sfcc/prefer-generated-job-step-types": "error" },
      },
    ],
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

test("suggests the generated type for an untyped job step export", () => {
  withJobStep((filename) => {
    const code = "const run = function () {}\nexports.run = run\n"
    const [message] = lint(code, filename)

    expect(message?.ruleId).toBe("sfcc/prefer-generated-job-step-types")
    expect(message?.message).toContain('SfccJobSteps.Definitions["custom.GenerateFeed"]')
    expect(message?.suggestions).toHaveLength(1)
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      '/** @type {SfccJobSteps.Definitions["custom.GenerateFeed"]["Functions"]["run"]} */',
    )
  })
})

test("suggests the generated type for an untyped function declaration", () => {
  withJobStep((filename) => {
    const code = 'function run() {\n  return "foo"\n}\nexports.run = run\n'
    const [message] = lint(code, filename)

    expect(message?.ruleId).toBe("sfcc/prefer-generated-job-step-types")
    expect(message?.suggestions).toHaveLength(1)
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      '/** @type {SfccJobSteps.Definitions["custom.GenerateFeed"]["Functions"]["run"]} */\nfunction run()',
    )
  })
})

test("reports a broad type that obscures the generated contract", () => {
  withJobStep((filename) => {
    const code = "/** @type {Function} */\nconst run = function () {}\nexports.run = run\n"
    const [message] = lint(code, filename)

    expect(message?.message).toContain('uses "Function" instead')
    expect(message?.suggestions?.[0]?.fix).toBeDefined()
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).not.toContain("@type {Function}")
  })
})

test("replaces a broad type on a function declaration", () => {
  withJobStep((filename) => {
    const code = '/** @type {Function} */\nfunction run() {\n  return "foo"\n}\nexports.run = run\n'
    const [message] = lint(code, filename)
    const output = applySuggestion(code, message?.suggestions?.[0] ?? {})

    expect(message?.message).toContain('uses "Function" instead')
    expect(output).not.toContain("@type {Function}")
    expect(output).toContain(
      '@type {SfccJobSteps.Definitions["custom.GenerateFeed"]["Functions"]["run"]}',
    )
  })
})

test("allows the matching generated job step type", () => {
  withJobStep((filename) => {
    const code = [
      '/** @type {SfccJobSteps.Definitions["custom.GenerateFeed"]["Functions"]["run"]} */',
      "const run = function () {}",
      "exports.run = run",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("allows a function declaration with the matching generated type", () => {
  withJobStep((filename) => {
    const code = [
      '/** @type {SfccJobSteps.Definitions["custom.GenerateFeed"]["Functions"]["run"]} */',
      "function run() {}",
      "exports.run = run",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("ignores scripts without an effective job step registration", () => {
  withJobStep((filename) => {
    const unregisteredFilename = path.join(path.dirname(filename), "helper.js")
    fs.mkdirSync(path.dirname(unregisteredFilename), { recursive: true })
    fs.writeFileSync(unregisteredFilename, "")

    expect(lint("exports.run = function () {}\n", unregisteredFilename)).toEqual([])
  })
})
