import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"

function withCustomApi<T>(code: string, run: (filename: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-custom-api-response-test-"))
  const previousCwd = process.cwd()
  const relativeDir = "cartridges/app_custom/cartridge/rest-apis/example"
  const relativeScriptPath = `${relativeDir}/script.js`

  process.chdir(tempDir)
  try {
    fs.mkdirSync(path.join(tempDir, relativeDir), { recursive: true })
    fs.writeFileSync(
      path.join(tempDir, relativeDir, "api.json"),
      `${JSON.stringify({ endpoints: [{ endpoint: "example", schema: "schema.yaml", implementation: "script" }] })}\n`,
    )
    fs.writeFileSync(path.join(tempDir, relativeScriptPath), code)
    return run(relativeScriptPath)
  } finally {
    process.chdir(previousCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function lint(code: string, filename: string) {
  return new Linter().verify(code, recommended, { filename })
}

test.each([
  "response.render('template')",
  "response.redirect('/account')",
  "response.setStatus(500)",
  "response.setContentType('text/html')",
  "response.getWriter().print('error')",
  "response.writer.print('error')",
  "response['render']('template')",
])("reports legacy response API usage: %s", (responseStatement) => {
  const code = `exports.example = function () { ${responseStatement} }\nexports.example.public = true\n`

  withCustomApi(code, (filename) => {
    const hits = lint(code, filename).filter(
      (message) => message.ruleId === "sfcc/no-custom-api-response-methods",
    )

    expect(hits).toHaveLength(1)
    expect(hits[0]?.messageId).toBe("useRestResponseMgr")
  })
})

test("allows RESTResponseMgr success and error responses", () => {
  const code = [
    'const RESTResponseMgr = require("dw/system/RESTResponseMgr")',
    "exports.example = function () {",
    "  if (request.httpMethod === 'GET') return RESTResponseMgr.createSuccess({ ok: true }).render()",
    "  return RESTResponseMgr.createError(400, 'invalid', 'Invalid', 'Bad request').render()",
    "}",
    "exports.example.public = true",
    "",
  ].join("\n")

  withCustomApi(code, (filename) => {
    expect(
      lint(code, filename).some(
        (message) => message.ruleId === "sfcc/no-custom-api-response-methods",
      ),
    ).toBe(false)
  })
})

test("allows a locally defined response value", () => {
  const code = [
    "exports.example = function (response) {",
    "  response.setStatus(500)",
    "}",
    "exports.example.public = true",
    "",
  ].join("\n")

  withCustomApi(code, (filename) => {
    expect(
      lint(code, filename).some(
        (message) => message.ruleId === "sfcc/no-custom-api-response-methods",
      ),
    ).toBe(false)
  })
})

test("ignores legacy response APIs outside Custom API implementations", () => {
  const code = "response.render('template')\n"
  const linter = new Linter()

  expect(
    linter
      .verify(code, recommended, {
        filename: "cartridges/app_custom/cartridge/controllers/Home.js",
      })
      .some((message) => message.ruleId === "sfcc/no-custom-api-response-methods"),
  ).toBe(false)
})
