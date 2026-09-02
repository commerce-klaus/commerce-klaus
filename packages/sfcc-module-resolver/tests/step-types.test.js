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
          },
        ],
      },
    }),
  ).toEqual([
    {
      functionName: "Run",
      kind: "script-module-step",
      module: "app_jobs/cartridge/scripts/generate-feed",
      typeId: "custom.GenerateFeed",
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
