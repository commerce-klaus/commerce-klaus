import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  findApiJsonFiles,
  findCustomApiDefinitions,
  findOperationByOperationId,
  getRequiredCustomApiExportsForScriptFile,
  resolveCustomApiScriptPath,
  resolveOasRef,
  schemaContainsAdditionalProperties,
} from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-module-resolver-custom-api-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeLoyaltyApi(cartridgesDir) {
  const restApiDir = path.join(
    cartridgesDir,
    "my_cartridge",
    "cartridge",
    "rest-apis",
    "loyalty-info",
  )
  fs.mkdirSync(restApiDir, { recursive: true })

  fs.writeFileSync(
    path.join(restApiDir, "api.json"),
    JSON.stringify({
      endpoints: [{ endpoint: "getLoyaltyInfo", schema: "schema.yaml", implementation: "script" }],
    }),
  )
  fs.writeFileSync(path.join(restApiDir, "script.js"), "exports.getLoyaltyInfo = function () {}\n")
  fs.writeFileSync(
    path.join(restApiDir, "schema.yaml"),
    [
      "openapi: 3.0.0",
      "info:",
      "  version: 1.0.1",
      "  title: Loyalty Information API",
      "components:",
      "  schemas:",
      "    LoyaltyInfo:",
      "      type: object",
      "      properties:",
      "        tier:",
      "          type: string",
      "paths:",
      "  /customers:",
      "    get:",
      "      operationId: getLoyaltyInfo",
      "      responses:",
      "        '200':",
      "          description: OK",
      "          content:",
      "            application/json:",
      "              schema:",
      "                $ref: '#/components/schemas/LoyaltyInfo'",
      "",
    ].join("\n"),
  )

  return restApiDir
}

test("findApiJsonFiles recursively finds api.json files under cartridgesDir", () => {
  withTempDir((tempDir) => {
    const restApiDir = writeLoyaltyApi(tempDir)

    expect(findApiJsonFiles(tempDir)).toEqual([path.join(restApiDir, "api.json")])
  })
})

test("findCustomApiDefinitions resolves schemas and matches the operationId", () => {
  withTempDir((tempDir) => {
    writeLoyaltyApi(tempDir)

    const definitions = findCustomApiDefinitions(tempDir)

    expect(definitions).toHaveLength(1)
    expect(definitions[0].endpoint).toBe("getLoyaltyInfo")
    expect(definitions[0].operation?.operation.operationId).toBe("getLoyaltyInfo")
    expect(definitions[0].document.components?.schemas?.LoyaltyInfo).toBeDefined()
  })
})

test("findOperationByOperationId returns undefined for unknown operationId", () => {
  withTempDir((tempDir) => {
    writeLoyaltyApi(tempDir)
    const [definition] = findCustomApiDefinitions(tempDir)

    expect(findOperationByOperationId(definition.document, "doesNotExist")).toBeUndefined()
  })
})

test("resolveCustomApiScriptPath appends known extensions", () => {
  withTempDir((tempDir) => {
    const restApiDir = writeLoyaltyApi(tempDir)

    expect(resolveCustomApiScriptPath(restApiDir, "script")).toBe(
      path.join(restApiDir, "script.js"),
    )
    expect(resolveCustomApiScriptPath(restApiDir, "missing")).toBeUndefined()
  })
})

test("getRequiredCustomApiExportsForScriptFile matches the implementation script", () => {
  withTempDir((tempDir) => {
    const restApiDir = writeLoyaltyApi(tempDir)
    const scriptPath = path.join(restApiDir, "script.js")

    const requiredExports = getRequiredCustomApiExportsForScriptFile(scriptPath)

    expect(requiredExports).toEqual([
      { operationId: "getLoyaltyInfo", schemaPath: path.join(restApiDir, "schema.yaml") },
    ])
  })
})

test("getRequiredCustomApiExportsForScriptFile returns an empty array for unrelated files", () => {
  withTempDir((tempDir) => {
    const scriptPath = path.join(tempDir, "unrelated.js")
    fs.mkdirSync(tempDir, { recursive: true })
    fs.writeFileSync(scriptPath, "")

    expect(getRequiredCustomApiExportsForScriptFile(scriptPath)).toEqual([])
  })
})

test("resolveOasRef resolves JSON pointer segments", () => {
  const document = { components: { schemas: { Foo: { type: "string" } } } }

  expect(resolveOasRef("#/components/schemas/Foo", document)).toEqual({ type: "string" })
  expect(resolveOasRef("#/components/schemas/Missing", document)).toBeUndefined()
})

test("schemaContainsAdditionalProperties detects nested additionalProperties", () => {
  const document = {
    components: {
      schemas: {
        Nested: {
          type: "object",
          properties: { extra: { type: "object", additionalProperties: true } },
        },
      },
    },
  }

  expect(schemaContainsAdditionalProperties({ type: "string" }, document)).toBe(false)
  expect(
    schemaContainsAdditionalProperties({ $ref: "#/components/schemas/Nested" }, document),
  ).toBe(true)
  expect(
    schemaContainsAdditionalProperties(
      { type: "array", items: { type: "object", additionalProperties: false } },
      document,
    ),
  ).toBe(true)
})
