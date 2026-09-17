import { ux } from "@oclif/core"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import Doctor from "../src/commands/klaus/doctor.ts"
import Inspect from "../src/commands/klaus/inspect.ts"
import Resolve from "../src/commands/klaus/resolve.ts"

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temporaryDirectories: string[] = []
const originalExitCode = process.exitCode

function createProjectDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "commerce-klaus-b2c-command-"))
  temporaryDirectories.push(directory)
  return directory
}

function captureStdout(): string[] {
  const output: string[] = []
  vi.spyOn(ux, "stdout").mockImplementation((text) => {
    output.push(Array.isArray(text) ? text.join("\n") : (text ?? ""))
  })
  return output
}

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = originalExitCode
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("registers source files for every new pattern command", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
  ) as { oclif?: { commands?: { strategy?: string; target?: string } } }

  expect(manifest.oclif?.commands).toEqual({ strategy: "pattern", target: "./dist/commands" })
  for (const command of ["doctor", "inspect", "resolve"]) {
    expect(
      fs.existsSync(path.join(packageDirectory, "src", "commands", "klaus", `${command}.ts`)),
    ).toBe(true)
  }
})

test("all project commands support B2C CLI JSON output", () => {
  expect(Doctor.enableJsonFlag).toBe(true)
  expect(Inspect.enableJsonFlag).toBe(true)
  expect(Resolve.enableJsonFlag).toBe(true)
})

describe("command execution", () => {
  test("inspect emits only the structured result in JSON mode", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

    const result = await Inspect.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges"), "--json"],
      { root: packageDirectory },
    )

    expect(result.cartridgeOrder).toEqual([path.join(projectDirectory, "cartridges", "app_custom")])
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
    expect(output[0]).not.toContain("Inspecting SFCC project")
  })

  test("resolve forwards cartridge and importer flags", async () => {
    const projectDirectory = createProjectDirectory()
    const cartridgesDirectory = path.join(projectDirectory, "cartridges")
    const cartridgeRoot = path.join(cartridgesDirectory, "app_custom")
    const importingFile = path.join(cartridgeRoot, "cartridge", "controllers", "Home.js")
    const modulePath = path.join(cartridgeRoot, "cartridge", "scripts", "example.js")
    fs.mkdirSync(path.dirname(importingFile), { recursive: true })
    fs.mkdirSync(path.dirname(modulePath), { recursive: true })
    fs.writeFileSync(importingFile, "module.exports = {}")
    fs.writeFileSync(modulePath, "module.exports = {}")
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

    const result = await Resolve.run(
      [
        "~/cartridge/scripts/example",
        "--cartridges-dir",
        cartridgesDirectory,
        "--cartridge-path",
        "app_custom",
        "--from",
        importingFile,
        "--json",
      ],
      { root: packageDirectory },
    )

    expect(result.resolved).toBe(modulePath)
    expect(result.cartridgeOrder).toEqual([cartridgeRoot])
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
    expect(output[0]).not.toContain("Resolving SFCC module")
  })

  test("doctor sets a failing exit code for invalid projects", async () => {
    const projectDirectory = createProjectDirectory()
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))
    process.exitCode = undefined

    const result = await Doctor.run(
      ["--cartridges-dir", path.join(projectDirectory, "missing"), "--json"],
      { root: packageDirectory },
    )

    expect(result.ok).toBe(false)
    expect(process.exitCode).toBe(1)
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
    expect(output[0]).not.toContain("Checking SFCC project")
  })

  test("doctor keeps a successful exit code for valid projects", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    captureStdout()
    process.exitCode = undefined

    const result = await Doctor.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges")],
      { root: packageDirectory },
    )

    expect(result.ok).toBe(true)
    expect(process.exitCode).toBeUndefined()
  })
})
