import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { generateCustomApiTypes } from "../src/custom-apis.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-custom-apis-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeLoyaltyApi(workspaceRoot) {
  const restApiDir = path.join(
    workspaceRoot,
    "cartridges",
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

  fs.writeFileSync(
    path.join(restApiDir, "schema.yaml"),
    [
      "openapi: 3.0.0",
      "info:",
      "  version: 1.0.1",
      "  title: Loyalty Information API",
      "components:",
      "  parameters:",
      "    siteId:",
      "      name: siteId",
      "      in: query",
      "      required: true",
      "      schema:",
      "        type: string",
      "  schemas:",
      "    LoyaltyInfo:",
      "      type: object",
      "      required:",
      "        - tier",
      "      properties:",
      "        tier:",
      "          type: string",
      "        points:",
      "          type: integer",
      "          nullable: true",
      "paths:",
      "  /customers:",
      "    get:",
      "      operationId: getLoyaltyInfo",
      "      parameters:",
      "        - $ref: '#/components/parameters/siteId'",
      "        - in: query",
      "          name: c_customer_id",
      "          required: true",
      "          schema:",
      "            type: string",
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
}

test("generateCustomApiTypes returns written=false when no rest-apis are found", () => {
  withTempDir((workspaceRoot) => {
    fs.mkdirSync(path.join(workspaceRoot, "cartridges"), { recursive: true })

    const result = generateCustomApiTypes({
      workspaceRoot,
      cartridgesDir: path.join(workspaceRoot, "cartridges"),
    })

    expect(result.written).toBe(false)
    expect(result.schemasCount).toBe(0)
    expect(result.operationsCount).toBe(0)
  })
})

test("generateCustomApiTypes generates schema and operation types from api.json + schema.yaml", () => {
  withTempDir((workspaceRoot) => {
    writeLoyaltyApi(workspaceRoot)

    const result = generateCustomApiTypes({
      workspaceRoot,
      cartridgesDir: path.join(workspaceRoot, "cartridges"),
    })

    expect(result.written).toBe(true)
    expect(result.schemasCount).toBe(1)
    expect(result.operationsCount).toBe(1)

    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")

    expect(generatedContent).toContain("namespace SfccCustomApis")
    expect(generatedContent).toContain('"LoyaltyInfo": {')
    expect(generatedContent).toContain('"tier": string')
    expect(generatedContent).toContain('"points"?: (number | null)')
    expect(generatedContent).toContain('"getLoyaltyInfo": {')
    expect(generatedContent).toContain('"siteId": string')
    expect(generatedContent).toContain('"c_customer_id": string')
    expect(generatedContent).toContain('Response: Schemas["LoyaltyInfo"]')
  })
})
