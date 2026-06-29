import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { main } from "../src/typecheck-cartridges.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-tooling-cli-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeJson(filePath, content) {
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

function setupValidProject(tempDir) {
  const cartridgesDir = path.join(tempDir, "cartridges")
  const solutionConfigPath = path.join(cartridgesDir, "jsconfig.json")
  const appBase = path.join(cartridgesDir, "app_base")
  const appBaseConfigPath = path.join(appBase, "jsconfig.json")
  const okFile = path.join(appBase, "cartridge", "scripts", "ok.js")

  fs.mkdirSync(path.dirname(okFile), { recursive: true })
  fs.writeFileSync(okFile, "// @ts-check\n/** @type {number} */\nconst ok = 1\n")

  writeJson(solutionConfigPath, {
    references: [{ path: "./app_base" }],
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

  return { cartridgesDir, solutionConfigPath }
}

function setupInvalidProject(tempDir) {
  const cartridgesDir = path.join(tempDir, "cartridges")
  const solutionConfigPath = path.join(cartridgesDir, "jsconfig.json")
  const appCustom = path.join(cartridgesDir, "app_custom")
  const appCustomConfigPath = path.join(appCustom, "jsconfig.json")
  const brokenFile = path.join(appCustom, "cartridge", "scripts", "broken.js")

  fs.mkdirSync(path.dirname(brokenFile), { recursive: true })
  fs.writeFileSync(brokenFile, '// @ts-check\n/** @type {number} */\nconst broken = "bad"\n')

  writeJson(solutionConfigPath, {
    references: [{ path: "./app_custom" }],
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

  return { cartridgesDir, solutionConfigPath }
}

function setupInvalidProjectWithoutReferences(tempDir) {
  const cartridgesDir = path.join(tempDir, "cartridges")
  const solutionConfigPath = path.join(cartridgesDir, "jsconfig.json")
  const brokenFile = path.join(cartridgesDir, "cartridge", "scripts", "broken.js")

  fs.mkdirSync(path.dirname(brokenFile), { recursive: true })
  fs.writeFileSync(brokenFile, '// @ts-check\n/** @type {number} */\nconst broken = "bad"\n')

  writeJson(solutionConfigPath, {
    compilerOptions: {
      allowJs: true,
      checkJs: true,
      noEmit: true,
      strict: true,
    },
    include: ["cartridge/**/*.js"],
  })

  return { cartridgesDir, solutionConfigPath }
}

function runCli(args, currentDirectory) {
  let exitCode = -1
  let stdout = ""
  let stderr = ""

  exitCode = main(args, {
    currentDirectory,
    writeStdout: (text) => {
      stdout += text
    },
    writeStderr: (text) => {
      stderr += text
    },
  })

  return { exitCode, stdout, stderr }
}

test("CLI exits with code 0 for valid default project", async () => {
  await withTempDir(async (tempDir) => {
    setupValidProject(tempDir)

    const result = runCli([], tempDir)

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
  })
})

test("CLI exits with code 2 and prints diagnostics for invalid project", async () => {
  await withTempDir(async (tempDir) => {
    const { solutionConfigPath } = setupInvalidProject(tempDir)

    const result = runCli(["--project", path.relative(tempDir, solutionConfigPath)], tempDir)

    expect(result.exitCode).toBe(2)
    expect(result.stdout).toContain("TS2322")
    expect(result.stdout).toContain("broken.js")
  })
})

test("CLI exits with code 1 for non-existing project file", async () => {
  await withTempDir(async (tempDir) => {
    const result = runCli(["--project", "cartridges/missing.json"], tempDir)

    expect(result.exitCode).toBe(1)
    expect(result.stderr).not.toBe("")
  })
})

test("CLI finds cartridges/jsconfig.json from parent directories", async () => {
  await withTempDir(async (tempDir) => {
    setupInvalidProjectWithoutReferences(tempDir)

    const scriptsDir = path.join(tempDir, "scripts")
    fs.mkdirSync(scriptsDir, { recursive: true })

    const result = runCli([], scriptsDir)

    expect(result.exitCode).toBe(2)
    expect(result.stdout).toContain("TS2322")
    expect(result.stdout).toContain("broken.js")
  })
})

test("CLI typechecks solution config even without references", async () => {
  await withTempDir(async (tempDir) => {
    setupInvalidProjectWithoutReferences(tempDir)

    const result = runCli([], tempDir)

    expect(result.exitCode).toBe(2)
    expect(result.stdout).toContain("TS2322")
    expect(result.stdout).toContain("broken.js")
  })
})
