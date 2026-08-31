import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"

// The recommended config matches files via the relative glob "cartridges/**/*.{js,ds}",
// so tests run inside a temporary cwd with real, relative-path fixture files.
function withTempCartridgesCwd<T>(run: (tempDir: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-valid-custom-api-export-test-"))
  const previousCwd = process.cwd()
  process.chdir(tempDir)

  try {
    return run(tempDir)
  } finally {
    process.chdir(previousCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeJson(filePath: string, content: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

function lint(code: string, filename: string) {
  const linter = new Linter()
  return linter.verify(code, recommended, { filename })
}

const restApiDir = "cartridges/app_custom/cartridge/rest-apis/loyalty-info"

function writeApiJson(tempDir: string): void {
  writeJson(path.join(tempDir, restApiDir, "api.json"), {
    endpoints: [{ endpoint: "getLoyaltyInfo", schema: "schema.yaml", implementation: "script" }],
  })
}

test("reports a missing static CommonJS export for a mapped Custom API endpoint", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    const relativeScriptPath = `${restApiDir}/script.js`
    const code = "exports.otherFunction = function () {}\n"
    fs.mkdirSync(path.dirname(path.join(tempDir, relativeScriptPath)), { recursive: true })
    fs.writeFileSync(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    const hits = messages.filter((message) => message.ruleId === "sfcc/valid-custom-api-export")

    expect(hits).toHaveLength(1)
    expect(hits[0]?.message).toContain('"getLoyaltyInfo"')
    expect(hits[0]?.messageId).toBe("missingCustomApiExport")
  })
})

test("reports a missing public flag when the export exists but is not public", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    const relativeScriptPath = `${restApiDir}/script.js`
    const code = "exports.getLoyaltyInfo = function () {}\n"
    fs.mkdirSync(path.dirname(path.join(tempDir, relativeScriptPath)), { recursive: true })
    fs.writeFileSync(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    const hits = messages.filter((message) => message.ruleId === "sfcc/valid-custom-api-export")

    expect(hits).toHaveLength(1)
    expect(hits[0]?.messageId).toBe("missingPublicFlag")
  })
})

test("allows a static export marked public", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    const relativeScriptPath = `${restApiDir}/script.js`
    const code = "exports.getLoyaltyInfo = function () {}\nexports.getLoyaltyInfo.public = true\n"
    fs.mkdirSync(path.dirname(path.join(tempDir, relativeScriptPath)), { recursive: true })
    fs.writeFileSync(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-custom-api-export")).toBe(
      false,
    )
  })
})

test("allows an exported handler marked public through its local binding", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    const relativeScriptPath = `${restApiDir}/script.js`
    const code = `
function accountLookup() {}
accountLookup.public = true
exports.getLoyaltyInfo = accountLookup
`
    fs.mkdirSync(path.dirname(path.join(tempDir, relativeScriptPath)), { recursive: true })
    fs.writeFileSync(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-custom-api-export")).toBe(
      false,
    )
  })
})

test("reports when a different local handler is marked public", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    const relativeScriptPath = `${restApiDir}/script.js`
    const code = `
function accountLookup() {}
function otherHandler() {}
otherHandler.public = true
exports.getLoyaltyInfo = accountLookup
`
    fs.mkdirSync(path.dirname(path.join(tempDir, relativeScriptPath)), { recursive: true })
    fs.writeFileSync(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    const hits = messages.filter((message) => message.ruleId === "sfcc/valid-custom-api-export")

    expect(hits).toHaveLength(1)
    expect(hits[0]?.messageId).toBe("missingPublicFlag")
  })
})

test("ignores files not referenced as an implementation by any api.json", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/helper.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    const code = "module.exports = {}\n"
    fs.writeFileSync(scriptPath, code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-custom-api-export")).toBe(
      false,
    )
  })
})
