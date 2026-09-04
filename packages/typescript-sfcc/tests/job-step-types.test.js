import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { generateJobStepTypes } from "../src/job-step-types.ts"

test("generateJobStepTypes creates declarations from effective steptypes.json definitions", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-job-step-types-test-"))
  const cartridgeRoot = path.join(workspaceRoot, "cartridges", "app_jobs")

  try {
    fs.mkdirSync(path.join(cartridgeRoot, "cartridge", "scripts"), { recursive: true })
    fs.writeFileSync(
      path.join(cartridgeRoot, "cartridge", "scripts", "jobs.js"),
      "exports.run = function () {}\n",
    )
    fs.writeFileSync(
      path.join(cartridgeRoot, "cartridge", "scripts", "chunk.js"),
      "exports.readNext = function () {}\nexports.process = function () {}\nexports.writeBatch = function () {}\n",
    )
    fs.writeFileSync(
      path.join(cartridgeRoot, "steptypes.json"),
      JSON.stringify({
        "step-types": {
          "script-module-step": [
            {
              "@type-id": "custom.GenerateFeed",
              function: "run",
              module: "app_jobs/cartridge/scripts/jobs",
              parameters: {
                parameter: [
                  {
                    "@name": "Mode",
                    "@type": "string",
                    "enum-values": { value: ["full", "delta"] },
                  },
                  {
                    "@name": "Limit",
                    "@required": false,
                    "@type": "long",
                    "default-value": "100",
                  },
                  {
                    "@name": "StartDate",
                    "@target-type": "date",
                    "@type": "date-string",
                  },
                ],
              },
              "status-codes": { status: [{ "@code": "FINISHED_WITH_WARNINGS" }] },
            },
          ],
          "chunk-script-module-step": [
            {
              "@type-id": "custom.ExportProducts",
              "chunk-size": 100,
              module: "app_jobs/cartridge/scripts/chunk",
              "after-step-function": "finish",
              "read-function": "readNext",
              "write-function": "writeBatch",
            },
          ],
        },
      }),
    )

    const result = generateJobStepTypes({ workspaceRoot })
    const generatedContent = fs.readFileSync(result.outputFilePath, "utf8")

    expect(result.declarationsCount).toBe(2)
    expect(result.sourceFiles).toEqual([path.join(cartridgeRoot, "steptypes.json")])
    expect(generatedContent).toContain('"custom.GenerateFeed": {')
    expect(generatedContent).toContain(
      'Input: { "Mode": "full" | "delta"; "Limit"?: number; "StartDate": Date }',
    )
    expect(generatedContent).toContain(
      'Parameters: { "Mode": "full" | "delta"; "Limit": number; "StartDate": Date }',
    )
    expect(generatedContent).toContain('StatusCode: "OK" | "ERROR" | "FINISHED_WITH_WARNINGS"')
    expect(generatedContent).toContain(
      '"run": (parameters: { "Mode": "full" | "delta"; "Limit": number; "StartDate": Date }, stepExecution: JobStepExecution) => Status | void',
    )
    expect(generatedContent).toContain('"custom.ExportProducts": {')
    expect(generatedContent).toContain(
      '"readNext": (parameters: Record<string, never>, stepExecution: JobStepExecution) => unknown | undefined',
    )
    expect(generatedContent).toContain(
      '"process": (item: unknown, parameters: Record<string, never>, stepExecution: JobStepExecution) => unknown | undefined',
    )
    expect(generatedContent).toContain(
      '"writeBatch": (items: List<unknown>, parameters: Record<string, never>, stepExecution: JobStepExecution) => void',
    )
    expect(generatedContent).toContain(
      '"finish": (success: boolean, parameters: Record<string, never>, stepExecution: JobStepExecution) => Status | void',
    )
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true })
  }
})
