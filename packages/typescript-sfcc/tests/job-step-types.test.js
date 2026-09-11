import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { generateJobStepTypes } from "../src/job-step-types.ts"
import { runProjectTypecheck } from "../src/typecheck.ts"

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
    expect(generatedContent).toContain("interface ChunkStepTypes {}")
    expect(generatedContent).toContain(
      "type ReadItem<TypeId extends keyof Definitions> = TypeId extends keyof ChunkStepTypes",
    )
    expect(generatedContent).toContain(
      "type ProcessedItem<TypeId extends keyof Definitions> = TypeId extends keyof ChunkStepTypes",
    )
    expect(generatedContent).toContain(
      '"readNext": (parameters: Record<string, never>, stepExecution: JobStepExecution) => ReadItem<"custom.ExportProducts"> | null | undefined',
    )
    expect(generatedContent).toContain(
      '"process": (item: ReadItem<"custom.ExportProducts">, parameters: Record<string, never>, stepExecution: JobStepExecution) => ProcessedItem<"custom.ExportProducts"> | null | undefined',
    )
    expect(generatedContent).toContain(
      '"writeBatch": (items: List<ProcessedItem<"custom.ExportProducts">>, parameters: Record<string, never>, stepExecution: JobStepExecution) => void',
    )
    expect(generatedContent).toContain(
      '"finish": (success: boolean, parameters: Record<string, never>, stepExecution: JobStepExecution) => Status | void',
    )
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true })
  }
})

test("generated chunk functions use project-defined item types", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-job-step-items-test-"))
  const cartridgesDir = path.join(workspaceRoot, "cartridges")
  const cartridgeRoot = path.join(cartridgesDir, "app_jobs")
  const sourceDir = path.join(cartridgeRoot, "cartridge", "scripts")
  const typesDir = path.join(workspaceRoot, ".b2c-script-types", "types")

  try {
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.mkdirSync(path.join(typesDir, "dw", "job"), { recursive: true })
    fs.mkdirSync(path.join(typesDir, "dw", "system"), { recursive: true })
    fs.mkdirSync(path.join(typesDir, "dw", "util"), { recursive: true })

    fs.writeFileSync(
      path.join(cartridgeRoot, "steptypes.json"),
      JSON.stringify({
        "step-types": {
          "chunk-script-module-step": [
            {
              "@type-id": "custom.TypedChunk",
              "chunk-size": 10,
              module: "app_jobs/cartridge/scripts/chunk",
              "read-function": "readNext",
              "process-function": "process",
              "write-function": "writeBatch",
            },
          ],
        },
      }),
    )
    fs.writeFileSync(
      path.join(cartridgesDir, "sfcc-job-steps.d.ts"),
      [
        "export {}",
        "declare global {",
        "  namespace SfccJobSteps {",
        "    interface ChunkStepTypes {",
        '      "custom.TypedChunk": {',
        "        ReadItem: number",
        "        ProcessedItem: { id: number }",
        "      }",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
    )
    fs.writeFileSync(
      path.join(sourceDir, "chunk.js"),
      [
        "// @ts-check",
        '/** @type {SfccJobSteps.Definitions["custom.TypedChunk"]["Functions"]["readNext"]} */',
        "exports.readNext = function () { return Math.random() > 0.5 ? 1 : null }",
        '/** @type {SfccJobSteps.Definitions["custom.TypedChunk"]["Functions"]["process"]} */',
        "exports.process = function (item) { return item > 0 ? { id: item } : null }",
        '/** @type {SfccJobSteps.Definitions["custom.TypedChunk"]["Functions"]["writeBatch"]} */',
        "exports.writeBatch = function (items) { items.toArray()[0].id.toFixed() }",
        "",
      ].join("\n"),
    )
    fs.writeFileSync(
      path.join(cartridgeRoot, "jsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          strict: true,
        },
        include: ["cartridge/**/*.js"],
      }),
    )
    fs.writeFileSync(
      path.join(typesDir, "dw", "job", "JobStepExecution.d.ts"),
      "declare class JobStepExecution {}\nexport = JobStepExecution\n",
    )
    fs.writeFileSync(
      path.join(typesDir, "dw", "system", "Status.d.ts"),
      "declare class Status {}\nexport = Status\n",
    )
    fs.writeFileSync(
      path.join(typesDir, "dw", "util", "List.d.ts"),
      "declare class List<Item> { toArray(): Item[] }\nexport = List\n",
    )

    generateJobStepTypes({ workspaceRoot })
    const diagnostics = runProjectTypecheck(
      path.join(cartridgeRoot, "jsconfig.json"),
      [cartridgeRoot],
      workspaceRoot,
    )

    expect(diagnostics).toHaveLength(0)
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true })
  }
})
