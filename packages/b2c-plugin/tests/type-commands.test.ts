import { ux } from "@oclif/core"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import Typecheck from "../src/commands/klaus/types/check.ts"
import CleanTypes from "../src/commands/klaus/types/clean.ts"
import TypesStatus from "../src/commands/klaus/types/status.ts"
import SyncTypes, { createB2cCommandArgs } from "../src/commands/klaus/types/sync.ts"

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temporaryDirectories: string[] = []
const originalExitCode = process.exitCode

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = originalExitCode
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true })
  }
})

test("uses the project's TypeScript SFCC package as a peer", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
  }

  expect(manifest.dependencies?.["@commerce-klaus/typescript-sfcc"]).toBeUndefined()
  expect(manifest.peerDependencies?.["@commerce-klaus/typescript-sfcc"]).toBe("^1.6.1")
})

test("type commands support B2C CLI JSON output", () => {
  expect(CleanTypes.enableJsonFlag).toBe(true)
  expect(Typecheck.enableJsonFlag).toBe(true)
  expect(SyncTypes.enableJsonFlag).toBe(true)
  expect(TypesStatus.enableJsonFlag).toBe(true)
})

test("types clean emits structured JSON and removes only generated types", async () => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "b2c-types-clean-"))
  temporaryDirectories.push(projectDirectory)
  const typesDirectory = path.join(projectDirectory, ".b2c-script-types/types")
  fs.mkdirSync(typesDirectory, { recursive: true })
  const generatedFile = path.join(typesDirectory, "sfcc-hooks.generated.d.ts")
  const scriptApiFile = path.join(typesDirectory, "global.d.ts")
  fs.writeFileSync(generatedFile, "generated\n")
  fs.writeFileSync(scriptApiFile, "script API\n")
  const output: string[] = []
  vi.spyOn(ux, "stdout").mockImplementation((text) => {
    output.push(Array.isArray(text) ? text.join("\n") : (text ?? ""))
  })
  vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

  const result = await CleanTypes.run(["--project-directory", projectDirectory, "--json"], {
    root: packageDirectory,
  })

  expect(result.files.find((file) => file.path === generatedFile)).toMatchObject({
    exists: true,
    removed: true,
  })
  expect(fs.existsSync(generatedFile)).toBe(false)
  expect(fs.existsSync(scriptApiFile)).toBe(true)
  expect(output).toHaveLength(1)
  expect(JSON.parse(output[0] ?? "")).toEqual(result)
  expect(output[0]).not.toContain("Cleaning generated SFCC types")
})

test("types status emits structured JSON and fails when generated types are missing", async () => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "b2c-types-status-"))
  temporaryDirectories.push(projectDirectory)
  const typesDirectory = path.join(projectDirectory, ".b2c-script-types/types")
  fs.mkdirSync(typesDirectory, { recursive: true })
  fs.writeFileSync(path.join(typesDirectory, "global.d.ts"), "export {}\n", "utf8")
  const output: string[] = []
  vi.spyOn(ux, "stdout").mockImplementation((text) => {
    output.push(Array.isArray(text) ? text.join("\n") : (text ?? ""))
  })
  vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))
  process.exitCode = undefined

  const result = await TypesStatus.run(["--project-directory", projectDirectory, "--json"], {
    root: packageDirectory,
  })

  expect(result.current).toBe(false)
  expect(process.exitCode).toBe(2)
  expect(output).toHaveLength(1)
  expect(JSON.parse(output[0] ?? "")).toEqual(result)
  expect(output[0]).not.toContain("Checking SFCC type status")
})

describe("createB2cCommandArgs", () => {
  test("removes the pnpm executable alias before delegating to the active B2C CLI", () => {
    expect(
      createB2cCommandArgs("pnpm", ["b2c", "setup", "ide", "vscode-types"], "/project"),
    ).toEqual(["setup", "ide", "vscode-types", "--project-directory", "/project"])
  })

  test("preserves arguments from a direct B2C executable", () => {
    expect(
      createB2cCommandArgs(
        "/project/node_modules/.bin/b2c",
        ["setup", "ide", "vscode-types"],
        "/project",
      ),
    ).toEqual(["setup", "ide", "vscode-types", "--project-directory", "/project"])
  })
})
