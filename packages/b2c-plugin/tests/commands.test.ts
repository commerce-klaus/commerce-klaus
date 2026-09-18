import { ux } from "@oclif/core"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import Doctor from "../src/commands/klaus/doctor.ts"
import Explain from "../src/commands/klaus/explain.ts"
import Graph from "../src/commands/klaus/graph.ts"
import Impact from "../src/commands/klaus/impact.ts"
import Inspect from "../src/commands/klaus/inspect.ts"
import Resolve from "../src/commands/klaus/resolve.ts"
import Validate from "../src/commands/klaus/validate.ts"

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
  for (const command of [
    "doctor",
    "explain",
    "graph",
    "impact",
    "inspect",
    "resolve",
    "validate",
  ]) {
    expect(
      fs.existsSync(path.join(packageDirectory, "src", "commands", "klaus", `${command}.ts`)),
    ).toBe(true)
  }
})

test("all project commands support B2C CLI JSON output", () => {
  expect(Doctor.enableJsonFlag).toBe(true)
  expect(Explain.enableJsonFlag).toBe(true)
  expect(Graph.enableJsonFlag).toBe(true)
  expect(Impact.enableJsonFlag).toBe(true)
  expect(Inspect.enableJsonFlag).toBe(true)
  expect(Resolve.enableJsonFlag).toBe(true)
  expect(Validate.enableJsonFlag).toBe(true)
})

describe("command execution", () => {
  test("explain emits the structured resolution trace in JSON mode", async () => {
    const projectDirectory = createProjectDirectory()
    const modulePath = path.join(
      projectDirectory,
      "cartridges",
      "app_custom",
      "cartridge",
      "scripts",
      "example.js",
    )
    fs.mkdirSync(path.dirname(modulePath), { recursive: true })
    fs.writeFileSync(modulePath, "module.exports = {}")
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

    const result = await Explain.run(
      [
        "*/cartridge/scripts/example",
        "--cartridges-dir",
        path.join(projectDirectory, "cartridges"),
        "--json",
      ],
      { root: packageDirectory },
    )

    expect(result).toMatchObject({ kind: "wildcard", resolved: modulePath })
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
  })

  test("graph emits only the structured result in JSON mode", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

    const result = await Graph.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges"), "--json"],
      { root: packageDirectory },
    )

    expect(result.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "cartridge", label: "app_custom" })]),
    )
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
    expect(output[0]).not.toContain("Graphing SFCC project")
  })

  test("graph focuses on matching nodes and their dependencies", async () => {
    const projectDirectory = createProjectDirectory()
    const controllerPath = path.join(
      projectDirectory,
      "cartridges",
      "app_custom",
      "cartridge",
      "controllers",
      "Product.js",
    )
    fs.mkdirSync(path.dirname(controllerPath), { recursive: true })
    fs.writeFileSync(
      controllerPath,
      [
        'const server = require("server")',
        'server.get("Show", authorizeCustomer, renderProduct)',
        'server.get("Search", searchProducts)',
        "module.exports = server.exports()",
      ].join("\n"),
    )
    captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

    const result = await Graph.run(
      [
        "--cartridges-dir",
        path.join(projectDirectory, "cartridges"),
        "--focus",
        "Product-Show",
        "--json",
      ],
      { root: packageDirectory },
    )

    expect(result.nodes.map((node) => node.label)).toEqual([
      "GET Product-Show",
      "authorizeCustomer",
      "renderProduct",
    ])
    expect(result.nodes.some((node) => node.label === "GET Product-Search")).toBe(false)
  })

  test("graph emits Graphviz DOT without human status text", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    const output = captureStdout()

    await Graph.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges"), "--format", "dot"],
      { root: packageDirectory },
    )

    expect(output).toHaveLength(1)
    expect(output[0]).toMatch(/^digraph sfcc_project \{/u)
    expect(output[0]).not.toContain("Project graph generated")
  })

  test("impact emits affected processes for a project file in JSON mode", async () => {
    const projectDirectory = createProjectDirectory()
    const controllerPath = path.join(
      projectDirectory,
      "cartridges",
      "app_custom",
      "cartridge",
      "controllers",
      "Product.js",
    )
    fs.mkdirSync(path.dirname(controllerPath), { recursive: true })
    fs.writeFileSync(
      controllerPath,
      [
        'const server = require("server")',
        'server.get("Show", renderProduct)',
        "module.exports = server.exports()",
      ].join("\n"),
    )
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))

    const result = await Impact.run(
      [controllerPath, "--cartridges-dir", path.join(projectDirectory, "cartridges"), "--json"],
      { root: packageDirectory },
    )

    expect(result.file).toBe(controllerPath)
    expect(result.nodes.map((node) => node.label)).toEqual([
      "app_custom/cartridge/controllers/Product.js",
      "GET Product-Show",
      "renderProduct",
    ])
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
  })

  test("graph emits Mermaid without human status text", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    const output = captureStdout()

    await Graph.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges"), "--format", "mermaid"],
      { root: packageDirectory },
    )

    expect(output).toHaveLength(1)
    expect(output[0]).toMatch(/^flowchart LR/u)
    expect(output[0]).not.toContain("Project graph generated")
  })

  test("graph writes Graphviz DOT directly to an output file", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    const outputFile = path.join(projectDirectory, "artifacts", "sfcc-project.dot")
    const output = captureStdout()

    await Graph.run(
      [
        "--cartridges-dir",
        path.join(projectDirectory, "cartridges"),
        "--format",
        "dot",
        "--output",
        outputFile,
      ],
      { root: packageDirectory },
    )

    expect(fs.readFileSync(outputFile, "utf8")).toMatch(/^digraph sfcc_project \{/u)
    expect(output).toHaveLength(1)
    expect(output[0]).toContain("DONE")
    expect(output[0]).not.toContain("digraph sfcc_project")
  })

  test("graph writes structured JSON directly to an output file", async () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })
    const outputFile = path.join(projectDirectory, "sfcc-project.json")
    captureStdout()

    const result = await Graph.run(
      [
        "--cartridges-dir",
        path.join(projectDirectory, "cartridges"),
        "--format",
        "json",
        "--output",
        outputFile,
      ],
      { root: packageDirectory },
    )

    expect(JSON.parse(fs.readFileSync(outputFile, "utf8"))).toEqual(result)
  })

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

  test("validate emits JSON diagnostics and fails for invalid contracts", async () => {
    const projectDirectory = createProjectDirectory()
    const cartridgeRoot = path.join(projectDirectory, "cartridges", "app_custom")
    fs.mkdirSync(cartridgeRoot, { recursive: true })
    fs.writeFileSync(path.join(cartridgeRoot, "steptypes.json"), "not json")
    const output = captureStdout()
    vi.spyOn(ux, "colorizeJson").mockImplementation((value) => JSON.stringify(value))
    process.exitCode = undefined

    const result = await Validate.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges"), "--json"],
      { root: packageDirectory },
    )

    expect(result).toMatchObject({ ok: false, errors: 1, warnings: 0 })
    expect(process.exitCode).toBe(1)
    expect(output).toHaveLength(1)
    expect(JSON.parse(output[0] ?? "")).toEqual(result)
    expect(output[0]).not.toContain("Validating SFCC project")
  })

  test("validate emits SARIF diagnostics and preserves the failing exit code", async () => {
    const projectDirectory = createProjectDirectory()
    const cartridgeRoot = path.join(projectDirectory, "cartridges", "app_custom")
    fs.mkdirSync(cartridgeRoot, { recursive: true })
    fs.writeFileSync(path.join(cartridgeRoot, "steptypes.json"), "not json")
    const output = captureStdout()
    process.exitCode = undefined

    const result = await Validate.run(
      ["--cartridges-dir", path.join(projectDirectory, "cartridges"), "--format", "sarif"],
      { root: packageDirectory },
    )
    const sarif = JSON.parse(output[0] ?? "")

    expect(result).toMatchObject({ ok: false, errors: 1, warnings: 0 })
    expect(process.exitCode).toBe(1)
    expect(output).toHaveLength(1)
    expect(sarif.version).toBe("2.1.0")
    expect(sarif.runs[0].results[0]).toMatchObject({
      ruleId: "invalid-step-types-file",
      level: "error",
    })
    expect(output[0]).not.toContain("Validating SFCC project")
  })

  test("validate rejects SARIF output in watch mode", async () => {
    await expect(
      Validate.run(["--format", "sarif", "--watch"], { root: packageDirectory }),
    ).rejects.toThrow("--watch cannot be combined with --format sarif")
  })

  test("validate watch reruns validation and updates the exit code", async () => {
    const projectDirectory = createProjectDirectory()
    const cartridgesDirectory = path.join(projectDirectory, "cartridges")
    fs.mkdirSync(path.join(cartridgesDirectory, "app_custom", "cartridge"), {
      recursive: true,
    })
    const output = captureStdout()
    process.exitCode = undefined
    const failingResult = {
      ok: false,
      errors: 1,
      warnings: 0,
      diagnostics: [],
      cartridgesDirectory,
      cartridgeOrder: [],
    }
    const passingResult = { ...failingResult, ok: true, errors: 0 }

    class TestValidate extends Validate {
      private validations = [failingResult, passingResult]

      protected validate(): typeof failingResult {
        const result = this.validations.shift()
        if (!result) {
          throw new Error("Unexpected validation run")
        }
        return result
      }

      protected async watchForChanges(_directory: string, onChange: () => void): Promise<void> {
        onChange()
      }
    }

    const result = await TestValidate.run(["--cartridges-dir", cartridgesDirectory, "--watch"], {
      root: packageDirectory,
    })

    expect(result.ok).toBe(true)
    expect(process.exitCode).toBeUndefined()
    expect(output.filter((line) => line.includes("Validating SFCC project"))).toHaveLength(2)
    expect(output.some((line) => line.includes("WATCH"))).toBe(true)
  })
})
