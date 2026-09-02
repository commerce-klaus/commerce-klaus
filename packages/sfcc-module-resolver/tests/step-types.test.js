import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  findResolvedStepTypeDefinitions,
  getStepTypeDefinitionsFromDocument,
} from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-step-types-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeJson(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

test("getStepTypeDefinitionsFromDocument parses script and chunk steps", () => {
  expect(
    getStepTypeDefinitionsFromDocument({
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.GenerateFeed",
            function: "Run",
            module: "app_jobs/cartridge/scripts/generate-feed",
            "timeout-in-seconds": "900",
            parameters: {
              parameter: [
                {
                  "@name": "DryRun",
                  "@required": "false",
                  "@type": "boolean",
                  "default-value": "true",
                },
              ],
            },
            "status-codes": {
              status: [{ "@code": "OK" }, { "@code": "ERROR" }],
            },
          },
          {
            "@type-id": "custom.EmptyParameters",
            function: "Run",
            module: "app_jobs/cartridge/scripts/empty-parameters",
            parameters: {},
          },
        ],
        "chunk-script-module-step": [
          {
            "@type-id": "custom.ExportProducts",
            "after-step-function": "finish",
            "before-step-function": "prepare",
            "chunk-size": "250",
            module: "app_jobs/cartridge/scripts/export-products.js",
            "process-function": "transform",
            "read-function": "readNext",
            "write-function": "writeBatch",
            parameters: {
              parameters: [
                {
                  "@name": "Limit",
                  "@required": true,
                  "@trim": false,
                  "@type": "long",
                  "default-value": 1000,
                },
              ],
            },
          },
        ],
      },
    }),
  ).toEqual([
    {
      functionName: "Run",
      kind: "script-module-step",
      module: "app_jobs/cartridge/scripts/generate-feed",
      parameters: [
        {
          defaultValue: "true",
          name: "DryRun",
          required: false,
          trim: false,
          type: "boolean",
        },
      ],
      statusCodes: ["OK", "ERROR"],
      timeoutSeconds: 900,
      typeId: "custom.GenerateFeed",
    },
    {
      functionName: "Run",
      kind: "script-module-step",
      module: "app_jobs/cartridge/scripts/empty-parameters",
      parameters: [],
      statusCodes: [],
      typeId: "custom.EmptyParameters",
    },
    {
      chunkSize: 250,
      functions: {
        afterStep: "finish",
        beforeStep: "prepare",
        process: "transform",
        read: "readNext",
        write: "writeBatch",
      },
      kind: "chunk-script-module-step",
      module: "app_jobs/cartridge/scripts/export-products.js",
      parameters: [
        {
          defaultValue: 1000,
          name: "Limit",
          required: true,
          trim: false,
          type: "long",
        },
      ],
      statusCodes: [],
      typeId: "custom.ExportProducts",
    },
  ])
})

test("getStepTypeDefinitionsFromDocument rejects malformed definitions", () => {
  expect(getStepTypeDefinitionsFromDocument(null)).toBeUndefined()
  expect(getStepTypeDefinitionsFromDocument({ "step-types": {} })).toBeUndefined()
  expect(
    getStepTypeDefinitionsFromDocument({
      "step-types": {
        "script-module-step": [{ "@type-id": "custom.MissingFunction", module: "job" }],
      },
    }),
  ).toBeUndefined()
  expect(
    getStepTypeDefinitionsFromDocument({
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.InvalidTimeout",
            function: "Run",
            module: "job",
            "timeout-in-seconds": "0",
          },
        ],
      },
    }),
  ).toBeUndefined()
  expect(
    getStepTypeDefinitionsFromDocument({
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.InvalidStatus",
            function: "Run",
            module: "job",
            "status-codes": { status: [{ description: "missing code" }] },
          },
        ],
      },
    }),
  ).toBeUndefined()
  expect(
    getStepTypeDefinitionsFromDocument({
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.InvalidParameter",
            function: "Run",
            module: "job",
            parameters: {
              parameter: [{ "@name": "Flag", "@type": "boolean", "@required": "yes" }],
            },
          },
        ],
      },
    }),
  ).toBeUndefined()
  expect(
    getStepTypeDefinitionsFromDocument({
      "step-types": {
        "chunk-script-module-step": [
          {
            "@type-id": "custom.InvalidChunk",
            "chunk-size": 0,
            module: "job",
            "read-function": "read",
            "write-function": "write",
          },
        ],
      },
    }),
  ).toBeUndefined()
})

test("findResolvedStepTypeDefinitions resolves modules and honors cartridge priority", () => {
  withTempDir((tempDir) => {
    const customRoot = path.join(tempDir, "cartridges", "app_custom")
    const baseRoot = path.join(tempDir, "cartridges", "app_base")

    for (const [cartridgeRoot, cartridgeName, functionName] of [
      [customRoot, "app_custom", "CustomRun"],
      [baseRoot, "app_base", "BaseRun"],
    ]) {
      const module = `${cartridgeName}/cartridge/scripts/jobs/feed`
      writeJson(path.join(cartridgeRoot, "steptypes.json"), {
        "step-types": {
          "script-module-step": [
            {
              "@type-id": "custom.GenerateFeed",
              function: functionName,
              module,
            },
          ],
        },
      })
      const scriptPath = path.join(cartridgeRoot, "cartridge", "scripts", "jobs", "feed.js")
      fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
      fs.writeFileSync(scriptPath, "exports.Run = function () {}\n")
    }

    expect(findResolvedStepTypeDefinitions([customRoot, baseRoot])).toEqual([
      {
        functionName: "CustomRun",
        kind: "script-module-step",
        module: "app_custom/cartridge/scripts/jobs/feed",
        modulePath: path.join(customRoot, "cartridge", "scripts", "jobs", "feed.js"),
        parameters: [],
        statusCodes: [],
        typeId: "custom.GenerateFeed",
      },
    ])
  })
})

test("findResolvedStepTypeDefinitions skips missing modules and malformed files", () => {
  withTempDir((tempDir) => {
    const malformedRoot = path.join(tempDir, "cartridges", "app_malformed")
    const missingRoot = path.join(tempDir, "cartridges", "app_missing")
    fs.mkdirSync(malformedRoot, { recursive: true })
    fs.writeFileSync(path.join(malformedRoot, "steptypes.json"), "not json")
    writeJson(path.join(missingRoot, "steptypes.json"), {
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.Missing",
            function: "Run",
            module: "app_missing/cartridge/scripts/missing",
          },
        ],
      },
    })

    expect(findResolvedStepTypeDefinitions([malformedRoot, missingRoot])).toEqual([])
  })
})
