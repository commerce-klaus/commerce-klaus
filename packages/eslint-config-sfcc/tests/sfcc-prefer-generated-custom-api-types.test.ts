import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { sfcc } from "../src/index.js"
import { applySuggestion } from "./test-utils.js"

function withCustomApi<T>(run: (filename: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-generated-api-types-test-"))
  const previousCwd = process.cwd()
  const directory = "cartridges/app_custom/cartridge/rest-apis/loyalty-info"
  const filename = `${directory}/script.js`
  fs.mkdirSync(path.join(tempDir, directory), { recursive: true })
  fs.writeFileSync(path.join(tempDir, filename), "")
  fs.writeFileSync(
    path.join(tempDir, directory, "api.json"),
    JSON.stringify({
      endpoints: [{ endpoint: "getLoyaltyInfo", implementation: "script", schema: "schema.yaml" }],
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
    [{ plugins: { sfcc }, rules: { "sfcc/prefer-generated-custom-api-types": "error" } }],
    { filename },
  )
}

test("suggests the generated type for a Custom API handler", () => {
  withCustomApi((filename) => {
    const code = [
      "function getLoyaltyInfo() {}",
      "getLoyaltyInfo.public = true",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")
    const [message] = lint(code, filename)

    expect(message?.ruleId).toBe("sfcc/prefer-generated-custom-api-types")
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */\nfunction getLoyaltyInfo()',
    )
  })
})

test("replaces a broad Custom API handler type", () => {
  withCustomApi((filename) => {
    const code = [
      "/** @type {Function} */",
      "function getLoyaltyInfo() {}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")
    const [message] = lint(code, filename)

    expect(message?.message).toContain('uses "Function" instead')
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      '@type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]}',
    )
  })
})

test("allows the matching generated Custom API handler type", () => {
  withCustomApi((filename) => {
    const code = [
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */',
      "function getLoyaltyInfo() {}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("suggests the generated response type for a local success value", () => {
  withCustomApi((filename) => {
    const code = [
      'const RESTResponseMgr = require("dw/system/RESTResponseMgr")',
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */',
      "function getLoyaltyInfo() {",
      '  const result = { tier: "silver" }',
      "  return RESTResponseMgr.createSuccess(result).render()",
      "}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")
    const [message] = lint(code, filename)

    expect(message?.messageId).toBe("missingGeneratedResponseType")
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Response"]} */\n  const result',
    )
  })
})

test("replaces a broad success response type", () => {
  withCustomApi((filename) => {
    const code = [
      'const RESTResponseMgr = require("dw/system/RESTResponseMgr")',
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */',
      "function getLoyaltyInfo() {",
      "  /** @type {Object} */",
      '  const result = { tier: "silver" }',
      "  return RESTResponseMgr.createSuccess(result).render()",
      "}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")
    const [message] = lint(code, filename)

    expect(message?.messageId).toBe("incorrectGeneratedResponseType")
    expect(applySuggestion(code, message?.suggestions?.[0] ?? {})).toContain(
      '@type {SfccCustomApis.Operations["getLoyaltyInfo"]["Response"]}',
    )
  })
})

test("allows a success value with the generated response type", () => {
  withCustomApi((filename) => {
    const code = [
      'const RESTResponseMgr = require("dw/system/RESTResponseMgr")',
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */',
      "function getLoyaltyInfo() {",
      '  /** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Response"]} */',
      '  const result = { tier: "silver" }',
      "  return RESTResponseMgr.createSuccess(result).render()",
      "}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("ignores response-like calls without the platform binding or a local identifier", () => {
  withCustomApi((filename) => {
    const code = [
      "const RESTResponseMgr = { createSuccess: function () {} }",
      "const outside = {}",
      "RESTResponseMgr.createSuccess(outside)",
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */',
      "function getLoyaltyInfo() {",
      "  RESTResponseMgr.createSuccess({ tier: 'silver' })",
      "}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("ignores platform responses outside the handler and error responses", () => {
  withCustomApi((filename) => {
    const code = [
      'const RESTResponseMgr = require("dw/system/RESTResponseMgr")',
      "const outside = {}",
      "RESTResponseMgr.createSuccess(outside)",
      '/** @type {SfccCustomApis.Operations["getLoyaltyInfo"]["Handler"]} */',
      "function getLoyaltyInfo() {",
      "  const errorDetails = {}",
      '  return RESTResponseMgr.createError(400, "invalid", "Invalid", errorDetails).render()',
      "}",
      "exports.getLoyaltyInfo = getLoyaltyInfo",
      "",
    ].join("\n")

    expect(lint(code, filename)).toEqual([])
  })
})

test("ignores scripts outside a Custom API registration", () => {
  withCustomApi(() => {
    const filename = "cartridges/app_custom/cartridge/scripts/helper.js"
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    fs.writeFileSync(filename, "")

    expect(lint("exports.getLoyaltyInfo = function () {}\n", filename)).toEqual([])
  })
})
