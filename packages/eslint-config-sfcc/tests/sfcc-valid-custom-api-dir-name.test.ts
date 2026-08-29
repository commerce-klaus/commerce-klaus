import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"

function withTempCartridgesCwd<T>(run: (tempDir: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-valid-custom-api-dir-name-test-"))
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

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function lint(code: string, filename: string) {
  const linter = new Linter()
  return linter.verify(code, recommended, { filename })
}

function writeApiJson(tempDir: string, restApiDir: string): void {
  writeJson(path.join(tempDir, restApiDir, "api.json"), {
    endpoints: [{ endpoint: "getLoyaltyInfo", schema: "schema.yaml", implementation: "script" }],
  })
}

test("reports a rest-apis directory name with disallowed characters", () => {
  withTempCartridgesCwd((tempDir) => {
    const restApiDir = "cartridges/app_custom/cartridge/rest-apis/loyaltyInfo"
    writeApiJson(tempDir, restApiDir)

    const relativeScriptPath = `${restApiDir}/script.js`
    const code = "exports.getLoyaltyInfo = function () {}\nexports.getLoyaltyInfo.public = true\n"
    writeFile(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    const hits = messages.filter((message) => message.ruleId === "sfcc/valid-custom-api-dir-name")

    expect(hits).toHaveLength(1)
    expect(hits[0]?.message).toContain('"loyaltyInfo"')
  })
})

test("allows a rest-apis directory name using only lowercase letters and hyphens", () => {
  withTempCartridgesCwd((tempDir) => {
    const restApiDir = "cartridges/app_custom/cartridge/rest-apis/loyalty-info"
    writeApiJson(tempDir, restApiDir)

    const relativeScriptPath = `${restApiDir}/script.js`
    const code = "exports.getLoyaltyInfo = function () {}\nexports.getLoyaltyInfo.public = true\n"
    writeFile(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-custom-api-dir-name")).toBe(
      false,
    )
  })
})

test("ignores files not referenced as an implementation by any api.json", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/helper.js"
    const code = "module.exports = {}\n"
    writeFile(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-custom-api-dir-name")).toBe(
      false,
    )
  })
})
