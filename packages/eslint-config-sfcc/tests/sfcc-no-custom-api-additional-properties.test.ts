import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"

function withTempCartridgesCwd<T>(run: (tempDir: string) => T): T {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sfcc-no-custom-api-additional-properties-test-"),
  )
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

const restApiDir = "cartridges/app_custom/cartridge/rest-apis/loyalty-info"

function writeApiJson(tempDir: string): void {
  writeJson(path.join(tempDir, restApiDir, "api.json"), {
    endpoints: [{ endpoint: "updateLoyaltyInfo", schema: "schema.yaml", implementation: "script" }],
  })
}

test("reports additionalProperties nested in the request body schema", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    writeFile(
      path.join(tempDir, restApiDir, "schema.yaml"),
      [
        "openapi: 3.0.0",
        "info:",
        "  version: 1.0.0",
        "  title: Loyalty Information API",
        "paths:",
        "  /customers:",
        "    post:",
        "      operationId: updateLoyaltyInfo",
        "      requestBody:",
        "        content:",
        "          application/json:",
        "            schema:",
        "              type: object",
        "              additionalProperties: true",
        "              properties:",
        "                points:",
        "                  type: number",
        "",
      ].join("\n"),
    )

    const relativeScriptPath = `${restApiDir}/script.js`
    const code =
      "exports.updateLoyaltyInfo = function () {}\nexports.updateLoyaltyInfo.public = true\n"
    writeFile(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    const hits = messages.filter(
      (message) => message.ruleId === "sfcc/no-custom-api-additional-properties",
    )

    expect(hits).toHaveLength(1)
    expect(hits[0]?.message).toContain('"updateLoyaltyInfo"')
  })
})

test("allows a request body schema without additionalProperties", () => {
  withTempCartridgesCwd((tempDir) => {
    writeApiJson(tempDir)
    writeFile(
      path.join(tempDir, restApiDir, "schema.yaml"),
      [
        "openapi: 3.0.0",
        "info:",
        "  version: 1.0.0",
        "  title: Loyalty Information API",
        "paths:",
        "  /customers:",
        "    post:",
        "      operationId: updateLoyaltyInfo",
        "      requestBody:",
        "        content:",
        "          application/json:",
        "            schema:",
        "              type: object",
        "              properties:",
        "                points:",
        "                  type: number",
        "",
      ].join("\n"),
    )

    const relativeScriptPath = `${restApiDir}/script.js`
    const code =
      "exports.updateLoyaltyInfo = function () {}\nexports.updateLoyaltyInfo.public = true\n"
    writeFile(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    expect(
      messages.some((message) => message.ruleId === "sfcc/no-custom-api-additional-properties"),
    ).toBe(false)
  })
})

test("ignores files not referenced as an implementation by any api.json", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/helper.js"
    const code = "module.exports = {}\n"
    writeFile(path.join(tempDir, relativeScriptPath), code)

    const messages = lint(code, relativeScriptPath)
    expect(
      messages.some((message) => message.ruleId === "sfcc/no-custom-api-additional-properties"),
    ).toBe(false)
  })
})
