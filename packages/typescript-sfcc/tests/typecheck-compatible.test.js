import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import nativeTypeScript from "typescript-7"
import { expect, test } from "vite-plus/test"

import {
  resolveTypeScriptBackend,
  typecheckSolutionProjectsCompatible,
} from "../src/typecheck-compatible.ts"
import { parseConfigFile } from "../src/typecheck.ts"
import { typecheckTest } from "./test-helpers.js"

const require = createRequire(import.meta.url)
const nativeTypeScriptVersion = require("typescript-7/package.json").version

async function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-compatible-test-"))

  try {
    return await run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function linkTypeScript(tempDir, packageName) {
  const packageDirectory = path.dirname(require.resolve(`${packageName}/package.json`))
  const nodeModulesDirectory = path.join(tempDir, "node_modules")
  fs.mkdirSync(nodeModulesDirectory, { recursive: true })
  fs.symlinkSync(packageDirectory, path.join(nodeModulesDirectory, "typescript"), "junction")
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function setupNativeProject(tempDir) {
  const cartridgesDir = path.join(tempDir, "cartridges")
  const appCustom = path.join(cartridgesDir, "app_custom")
  const appBase = path.join(cartridgesDir, "app_base")
  const customController = path.join(appCustom, "cartridge", "controllers", "Product.js")
  const baseController = path.join(appBase, "cartridge", "controllers", "Product.js")
  const localScript = path.join(appCustom, "cartridge", "scripts", "local.js")
  const sharedScript = path.join(appBase, "cartridge", "scripts", "shared.js")
  const loggerDeclaration = path.join(
    tempDir,
    ".b2c-script-types",
    "types",
    "dw",
    "system",
    "Logger.d.ts",
  )
  const configPath = path.join(appCustom, "jsconfig.json")
  const baseConfigPath = path.join(appBase, "jsconfig.json")
  const solutionConfigPath = path.join(cartridgesDir, "jsconfig.json")

  for (const filePath of [
    customController,
    baseController,
    localScript,
    sharedScript,
    loggerDeclaration,
  ]) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
  }

  fs.writeFileSync(
    customController,
    [
      "// @ts-check",
      'const Logger = require("dw/system/Logger")',
      'const local = require("~/cartridge/scripts/local")',
      'const shared = require("*/cartridge/scripts/shared")',
      "const base = module.superModule",
      'Logger.info("ready")',
      'local.read("wrong")',
      'shared.read("wrong")',
      'base.show("wrong")',
      "module.exports = base",
      "",
    ].join("\n"),
  )
  fs.writeFileSync(
    baseController,
    [
      "// @ts-check",
      "/** @param {number} id */",
      "exports.show = function (id) { return id }",
      "",
    ].join("\n"),
  )
  fs.writeFileSync(
    localScript,
    [
      "// @ts-check",
      "/** @param {number} id */",
      "exports.read = function (id) { return id }",
      "",
    ].join("\n"),
  )
  fs.writeFileSync(
    sharedScript,
    [
      "// @ts-check",
      "/** @param {number} id */",
      "exports.read = function (id) { return id }",
      "",
    ].join("\n"),
  )
  fs.writeFileSync(
    loggerDeclaration,
    [
      "declare class Logger {",
      "  static info(message: string): void",
      "}",
      "export = Logger",
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
  writeJson(baseConfigPath, {
    compilerOptions: {
      allowJs: true,
      checkJs: true,
      noEmit: true,
      strict: true,
    },
    include: ["cartridge/**/*.js"],
  })
  writeJson(solutionConfigPath, {
    files: [],
    references: [{ path: "./app_custom" }, { path: "./app_base" }],
  })

  return { appBase, appCustom, cartridgesDir, solutionConfigPath }
}

test("selects compiler backends without treating TypeScript 7.0 as compatible", () => {
  expect(resolveTypeScriptBackend("5.5.4")).toBe("legacy")
  expect(resolveTypeScriptBackend("6.0.2")).toBe("legacy")
  expect(resolveTypeScriptBackend("7.1.0-beta")).toBe("native")
  expect(() => resolveTypeScriptBackend("5.4.5")).toThrow("Unsupported TypeScript version")
  expect(() => resolveTypeScriptBackend("7.0.0")).toThrow("Unsupported TypeScript version")
})

test("legacy synchronous APIs direct TypeScript 7 users to the compatible API", () => {
  expect(() => parseConfigFile("/missing/jsconfig.json", "/", nativeTypeScript)).toThrow(
    "typecheckSolutionProjectsCompatible()",
  )
})

typecheckTest("uses the legacy backend for TypeScript 6", async () => {
  await withTempDir(async (tempDir) => {
    linkTypeScript(tempDir, "typescript-legacy")
    const { appCustom, solutionConfigPath } = setupNativeProject(tempDir)

    const result = await typecheckSolutionProjectsCompatible({
      cartridgesDir: path.dirname(appCustom),
      cwd: tempDir,
      solutionConfigPath,
    })

    expect(result.backend).toBe("legacy")
    expect(result.typescriptVersion).toMatch(/^6\./u)
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 2345)).toHaveLength(3)
  })
})

typecheckTest("uses TypeScript 7.1 for SFCC modules and super modules", async () => {
  await withTempDir(async (tempDir) => {
    linkTypeScript(tempDir, "typescript-7")
    const { cartridgesDir, solutionConfigPath } = setupNativeProject(tempDir)

    const result = await typecheckSolutionProjectsCompatible({
      cartridgesDir,
      cwd: tempDir,
      solutionConfigPath,
    })

    expect(result.backend).toBe("native")
    expect(result.typescriptVersion).toBe(nativeTypeScriptVersion)
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 2345)).toHaveLength(3)
    expect(result.formattedDiagnostics).toContain("Product.js")
    expect(result.formattedDiagnostics).toContain("TS2345")
  })
})
