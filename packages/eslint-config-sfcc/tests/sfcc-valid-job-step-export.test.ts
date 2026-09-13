import { Linter } from "eslint"
import fs from "node:fs"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import { withTemporaryCwd, writeJson } from "./test-utils.js"

const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/jobs/sample.js"

function lint(code: string, filename: string) {
  const linter = new Linter()
  return linter.verify(code, recommended, { filename })
}

function writeStepFixture(
  tempDir: string,
  definition: Record<string, unknown>,
  code: string,
): void {
  writeJson(path.join(tempDir, "cartridges", "app_custom", "steptypes.json"), {
    "step-types": definition,
  })
  const scriptPath = path.join(tempDir, relativeScriptPath)
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
  fs.writeFileSync(scriptPath, code)
}

function scriptStep(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "script-module-step": [
      {
        "@type-id": "custom.Sample",
        module: "app_custom/cartridge/scripts/jobs/sample",
        ...overrides,
      },
    ],
  }
}

test("reports the missing default execute export for a script module job step", () => {
  withTemporaryCwd("sfcc-valid-job-step-export-test-", (tempDir) => {
    writeStepFixture(tempDir, scriptStep(), "exports.run = function () {}\n")

    const messages = lint("exports.run = function () {}\n", relativeScriptPath)
    const hits = messages.filter((message) => message.ruleId === "sfcc/valid-job-step-export")

    expect(hits).toHaveLength(1)
    expect(hits[0]?.message).toContain('"custom.Sample"')
    expect(hits[0]?.message).toContain('"execute"')
  })
})

test("uses the configured function name for a script module job step", () => {
  withTemporaryCwd("sfcc-valid-job-step-export-test-", (tempDir) => {
    const code = "exports.execute = function () {}\n"
    writeStepFixture(tempDir, scriptStep({ function: "run" }), code)

    const messages = lint(code, relativeScriptPath)
    const hit = messages.find((message) => message.ruleId === "sfcc/valid-job-step-export")

    expect(hit?.message).toContain('"run"')
  })
})

test("reports every missing configured chunk function", () => {
  withTemporaryCwd("sfcc-valid-job-step-export-test-", (tempDir) => {
    const code = [
      "exports.readItems = function () {}",
      "exports.writeItems = function () {}",
      "exports.process = function () {}",
      "exports.before = function () {}",
      "",
    ].join("\n")
    writeStepFixture(
      tempDir,
      {
        "chunk-script-module-step": [
          {
            "@type-id": "custom.SampleChunk",
            module: "app_custom/cartridge/scripts/jobs/sample",
            "chunk-size": 100,
            "read-function": "readItems",
            "write-function": "writeItems",
            "before-step-function": "before",
            "after-step-function": "after",
          },
        ],
      },
      code,
    )

    const hits = lint(code, relativeScriptPath).filter(
      (message) => message.ruleId === "sfcc/valid-job-step-export",
    )

    expect(hits).toHaveLength(1)
    expect(hits[0]?.message).toContain('"after"')
  })
})

test("allows supported static CommonJS export forms", () => {
  withTemporaryCwd("sfcc-valid-job-step-export-test-", (tempDir) => {
    const code = "module.exports = { run: function () {} }\n"
    writeStepFixture(tempDir, scriptStep({ function: "run" }), code)

    const messages = lint(code, relativeScriptPath)

    expect(messages.some((message) => message.ruleId === "sfcc/valid-job-step-export")).toBe(false)
  })
})

test("ignores files not referenced by steptypes.json", () => {
  withTemporaryCwd("sfcc-valid-job-step-export-test-", (tempDir) => {
    const relativeHelperPath = "cartridges/app_custom/cartridge/scripts/helper.js"
    const helperPath = path.join(tempDir, relativeHelperPath)
    fs.mkdirSync(path.dirname(helperPath), { recursive: true })
    fs.writeFileSync(helperPath, "module.exports = {}\n")

    const messages = lint("module.exports = {}\n", relativeHelperPath)

    expect(messages.some((message) => message.ruleId === "sfcc/valid-job-step-export")).toBe(false)
  })
})
