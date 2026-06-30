import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  formatDiagnostics,
  parseConfigFile,
  runProjectTypecheck,
  typecheckSolutionProjects,
} from "../src/typecheck.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-tooling-typecheck-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function withEnvUnset(key, run) {
  const previousValue = process.env[key]
  delete process.env[key]

  try {
    return run()
  } finally {
    if (previousValue === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = previousValue
    }
  }
}

function writeJson(filePath, content) {
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

test("parseConfigFile parses a valid config and resolves file names", () => {
  withTempDir((tempDir) => {
    const configPath = path.join(tempDir, "jsconfig.json")
    const sourcePath = path.join(tempDir, "index.js")

    fs.writeFileSync(sourcePath, "// @ts-check\n/** @type {number} */\nconst value = 1\n")
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["index.js"],
    })

    const parsed = parseConfigFile(configPath, tempDir)

    expect(parsed.fileNames).toContain(sourcePath)
  })
})

test("parseConfigFile reports errors for invalid config JSON", () => {
  withTempDir((tempDir) => {
    const configPath = path.join(tempDir, "jsconfig.json")
    fs.writeFileSync(configPath, "{ invalid json\n")

    const parsed = parseConfigFile(configPath, tempDir)

    expect(parsed.errors.length).toBeGreaterThan(0)
  })
})

test("runProjectTypecheck returns no diagnostics for valid JavaScript with JSDoc", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "ok.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, "// @ts-check\n/** @type {number} */\nconst count = 1\n")
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics).toHaveLength(0)
  })
})

test("runProjectTypecheck reports diagnostics for invalid JavaScript with JSDoc", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "broken.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, '// @ts-check\n/** @type {number} */\nconst count = "bad"\n')
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2322)).toBe(true)
  })
})

test("runProjectTypecheck resolves */ imports without explicit wildcard path mappings", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const appBase = path.join(cartridgesDir, "app_base")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "entry.js")
    const baseHelperPath = path.join(appBase, "cartridge", "scripts", "helper.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.mkdirSync(path.dirname(baseHelperPath), { recursive: true })

    fs.writeFileSync(baseHelperPath, "module.exports = { value: 1 }\n")
    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        'const helper = require("*/cartridge/scripts/helper")',
        "module.exports = helper",
        "",
      ].join("\n"),
    )

    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom, appBase], tempDir)

    expect(diagnostics).toHaveLength(0)
  })
})

test("typecheckSolutionProjects typechecks all references from solution config", () => {
  withTempDir((tempDir) => {
    withEnvUnset("SFCC_CARTRIDGE_PATH", () => {
      const cartridgesDir = path.join(tempDir, "cartridges")
      const solutionConfigPath = path.join(cartridgesDir, "jsconfig.json")
      const appBase = path.join(cartridgesDir, "app_base")
      const appCustom = path.join(cartridgesDir, "app_custom")

      const baseSource = path.join(appBase, "cartridge", "scripts", "ok.js")
      const customSource = path.join(appCustom, "cartridge", "scripts", "broken.js")
      const appBaseConfigPath = path.join(appBase, "jsconfig.json")
      const appCustomConfigPath = path.join(appCustom, "jsconfig.json")

      fs.mkdirSync(path.dirname(baseSource), { recursive: true })
      fs.mkdirSync(path.dirname(customSource), { recursive: true })

      fs.writeFileSync(baseSource, "// @ts-check\n/** @type {number} */\nconst base = 1\n")
      fs.writeFileSync(customSource, '// @ts-check\n/** @type {number} */\nconst custom = "bad"\n')

      writeJson(solutionConfigPath, {
        references: [{ path: "./app_base" }, { path: "./app_custom" }],
      })
      writeJson(appBaseConfigPath, {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          strict: true,
        },
        include: ["cartridge/**/*.js"],
      })
      writeJson(appCustomConfigPath, {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          strict: true,
        },
        include: ["cartridge/**/*.js"],
      })

      const diagnostics = typecheckSolutionProjects({
        solutionConfigPath,
        cartridgesDir,
      })

      expect(diagnostics.length).toBeGreaterThan(0)
      expect(
        diagnostics.some(
          (diagnostic) =>
            diagnostic.file?.fileName && diagnostic.file.fileName.endsWith("broken.js"),
        ),
      ).toBe(true)
    })
  })
})

test("formatDiagnostics returns human-readable output", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "broken.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, '// @ts-check\n/** @type {number} */\nconst count = "bad"\n')
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)
    const output = formatDiagnostics([...diagnostics], tempDir)

    expect(output).toContain("broken.js")
    expect(output).toContain("TS2322")
  })
})

test("runProjectTypecheck reports diagnostics for JSDoc @param mismatch", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "param-mismatch.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        "/** @param {number} amount */",
        "function double(amount) {",
        "  return amount * 2",
        "}",
        'double("2")',
        "",
      ].join("\n"),
    )
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2345)).toBe(true)
  })
})

test("runProjectTypecheck reports diagnostics for JSDoc @typedef object mismatch", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCustom = path.join(cartridgesDir, "app_custom")
    const configPath = path.join(appCustom, "jsconfig.json")
    const sourcePath = path.join(appCustom, "cartridge", "scripts", "typedef-mismatch.js")

    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(
      sourcePath,
      [
        "// @ts-check",
        "/**",
        " * @typedef {{ id: number, name: string }} Product",
        " */",
        "",
        "/** @type {Product} */",
        "const product = { id: 1, name: 42 }",
        "",
      ].join("\n"),
    )
    writeJson(configPath, {
      compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: true,
      },
      include: ["cartridge/**/*.js"],
    })

    const diagnostics = runProjectTypecheck(configPath, [appCustom], tempDir)

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.some((diagnostic) => diagnostic.code === 2322)).toBe(true)
  })
})
