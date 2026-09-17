import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { validateSfccProject } from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-project-validation-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function writeJson(filePath, content) {
  writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

test("validateSfccProject accepts valid project contracts", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const cartridgeRoot = path.join(cartridgesDir, "app_custom")
    writeJson(path.join(cartridgeRoot, "package.json"), { hooks: "hooks.json" })
    writeJson(path.join(cartridgeRoot, "hooks.json"), {
      hooks: [{ name: "app.example.ready", script: "./cartridge/scripts/hook" }],
    })
    writeFile(
      path.join(cartridgeRoot, "cartridge", "scripts", "hook.js"),
      "exports.ready = () => {}\n",
    )

    expect(validateSfccProject({ cartridgesDir, cartridgeRoots: [cartridgeRoot] })).toEqual({
      ok: true,
      errors: 0,
      warnings: 0,
      diagnostics: [],
    })
  })
})

test("validateSfccProject reports malformed and unresolved contracts", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const cartridgeRoot = path.join(cartridgesDir, "app_custom")
    writeJson(path.join(cartridgeRoot, "package.json"), { hooks: "hooks.json" })
    writeJson(path.join(cartridgeRoot, "hooks.json"), {
      hooks: [{ name: "app.example.missing", script: "./cartridge/scripts/missing" }],
    })
    writeJson(path.join(cartridgeRoot, "steptypes.json"), {
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.Missing",
            module: "app_custom/cartridge/scripts/jobs/missing",
          },
        ],
      },
    })
    const apiDirectory = path.join(cartridgeRoot, "cartridge", "rest-apis", "sample")
    writeJson(path.join(apiDirectory, "api.json"), {
      endpoints: [{ endpoint: "getSample", schema: "missing.yaml", implementation: "missing" }],
    })

    const result = validateSfccProject({ cartridgesDir, cartridgeRoots: [cartridgeRoot] })

    expect(result.ok).toBe(false)
    expect(result.warnings).toBe(0)
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "hook-script-not-found",
      "step-module-not-found",
      "custom-api-schema-not-found",
      "custom-api-script-not-found",
    ])
  })
})

test("validateSfccProject reports registrations hidden by cartridge precedence", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const cartridgeRoots = ["app_custom", "app_base"].map((name) => path.join(cartridgesDir, name))

    for (const cartridgeRoot of cartridgeRoots) {
      writeJson(path.join(cartridgeRoot, "package.json"), { hooks: "hooks.json" })
      writeJson(path.join(cartridgeRoot, "hooks.json"), {
        hooks: [{ name: "app.example.ready", script: "./cartridge/scripts/hook" }],
      })
      writeFile(
        path.join(cartridgeRoot, "cartridge", "scripts", "hook.js"),
        "exports.ready = () => {}\n",
      )
    }

    const result = validateSfccProject({ cartridgesDir, cartridgeRoots })

    expect(result.ok).toBe(true)
    expect(result.warnings).toBe(1)
    expect(result.diagnostics[0]).toMatchObject({
      code: "hook-overridden",
      severity: "warning",
      file: path.join(cartridgeRoots[1], "hooks.json"),
    })
  })
})

test("validateSfccProject rejects empty and incorrectly typed metadata fields", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const cartridgeRoot = path.join(cartridgesDir, "app_custom")
    writeJson(path.join(cartridgeRoot, "package.json"), { hooks: "" })
    writeJson(path.join(cartridgeRoot, "cartridge", "rest-apis", "sample", "api.json"), {
      endpoints: [{ endpoint: "getSample", schema: 42, implementation: "script" }],
    })

    const result = validateSfccProject({ cartridgesDir, cartridgeRoots: [cartridgeRoot] })

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "invalid-hooks-declaration",
      "invalid-custom-api-endpoint",
    ])
  })
})
