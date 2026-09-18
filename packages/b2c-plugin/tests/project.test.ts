import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { explainProjectModule } from "../src/commands/klaus/explain.ts"
import { resolveProjectModule } from "../src/commands/klaus/resolve.ts"
import {
  diagnoseProject,
  getProjectGraph,
  getProjectGraphDiff,
  getProjectImpact,
  getProjectInspection,
  validateProject,
} from "../src/project.ts"

const temporaryDirectories: string[] = []

function createProjectDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "commerce-klaus-b2c-plugin-"))
  temporaryDirectories.push(directory)
  return directory
}

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents)
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

describe("resolveProjectModule", () => {
  test("explains cartridge precedence and matching candidates", () => {
    const projectDirectory = createProjectDirectory()
    const relativeModule = path.join("cartridge", "scripts", "example.js")

    for (const cartridge of ["app_base", "app_custom"]) {
      writeFile(
        path.join(projectDirectory, "cartridges", cartridge, relativeModule),
        `module.exports = "${cartridge}"`,
      )
    }

    const result = resolveProjectModule({
      moduleName: "*/cartridge/scripts/example",
      cwd: projectDirectory,
      cartridgesDir: "cartridges",
      cartridgePath: "app_custom:app_base",
    })

    expect(result.resolved).toBe(
      path.join(projectDirectory, "cartridges", "app_custom", relativeModule),
    )
    expect(result.cartridgeOrder.map((root) => path.basename(root))).toEqual([
      "app_custom",
      "app_base",
    ])
    expect(result.candidates).toHaveLength(2)
  })

  test("uses the importing cartridge for tilde modules", () => {
    const projectDirectory = createProjectDirectory()
    const cartridgeRoot = path.join(projectDirectory, "cartridges", "app_custom")
    const importingFile = path.join(cartridgeRoot, "cartridge", "controllers", "Home.js")
    const modulePath = path.join(cartridgeRoot, "cartridge", "scripts", "example.js")
    writeFile(importingFile, "module.exports = {}")
    writeFile(modulePath, "module.exports = {}")

    expect(
      resolveProjectModule({
        moduleName: "~/cartridge/scripts/example",
        cwd: projectDirectory,
        cartridgesDir: "cartridges",
        containingFile: importingFile,
      }).resolved,
    ).toBe(modulePath)
  })

  test("returns an empty result when no module matches", () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })

    expect(
      resolveProjectModule({
        moduleName: "*/cartridge/scripts/missing",
        cwd: projectDirectory,
        cartridgesDir: "cartridges",
      }),
    ).toMatchObject({ resolved: null, candidates: [] })
  })
})

describe("explainProjectModule", () => {
  test("reports every attempted wildcard file in cartridge order", () => {
    const projectDirectory = createProjectDirectory()
    const cartridgesDirectory = path.join(projectDirectory, "cartridges")
    const appCustom = path.join(cartridgesDirectory, "app_custom")
    const appBase = path.join(cartridgesDirectory, "app_base")
    const baseModule = path.join(appBase, "cartridge", "models", "product.js")
    fs.mkdirSync(path.join(appCustom, "cartridge"), { recursive: true })
    writeFile(baseModule, "module.exports = {}")

    const result = explainProjectModule({
      moduleName: "*/cartridge/models/product",
      cwd: projectDirectory,
      cartridgesDir: "cartridges",
      cartridgePath: "app_custom:app_base",
    })

    expect(result.resolved).toBe(baseModule)
    expect(result.attempts).toHaveLength(2)
    expect(result.attempts[0].candidates).toContain(
      path.join(appCustom, "cartridge", "models", "product.js"),
    )
  })

  test("requires an importer for contextual module forms", () => {
    expect(() =>
      explainProjectModule({
        moduleName: "module.superModule",
        cwd: "/project",
        cartridgesDir: "cartridges",
      }),
    ).toThrow("--from is required for module.superModule")
  })
})

test("inspect reports the effective project metadata", () => {
  const projectDirectory = createProjectDirectory()
  const cartridgeRoot = path.join(projectDirectory, "cartridges", "app_custom")

  writeFile(path.join(cartridgeRoot, "package.json"), JSON.stringify({ hooks: "hooks.json" }))
  writeFile(
    path.join(cartridgeRoot, "hooks.json"),
    JSON.stringify({ hooks: [{ name: "dw.order.test", script: "cartridge/scripts/hook" }] }),
  )
  writeFile(
    path.join(cartridgeRoot, "cartridge", "scripts", "hook.js"),
    "exports.test = function () {}",
  )

  const result = getProjectInspection({
    cwd: projectDirectory,
    cartridgesDir: "cartridges",
  })

  expect(result.cartridgeOrder).toEqual([cartridgeRoot])
  expect(result.hooks).toEqual([
    {
      name: "dw.order.test",
      scriptPath: path.join(cartridgeRoot, "cartridge", "scripts", "hook.js"),
    },
  ])
  expect(result.jobSteps).toEqual([])
  expect(result.customApis).toEqual([])
})

test("graph preserves the configured cartridge precedence", () => {
  const projectDirectory = createProjectDirectory()
  for (const cartridge of ["app_base", "app_custom"]) {
    fs.mkdirSync(path.join(projectDirectory, "cartridges", cartridge, "cartridge"), {
      recursive: true,
    })
  }

  const result = getProjectGraph({
    cwd: projectDirectory,
    cartridgesDir: "cartridges",
    cartridgePath: "app_custom:app_base",
  })

  expect(result.cartridgeOrder.map((root) => path.basename(root))).toEqual([
    "app_custom",
    "app_base",
  ])
  expect(result.edges).toContainEqual(expect.objectContaining({ kind: "precedes" }))
})

test("graph diff compares effective cartridge paths", () => {
  const projectDirectory = createProjectDirectory()
  const baseController = path.join(
    projectDirectory,
    "cartridges",
    "app_base",
    "cartridge",
    "controllers",
    "Product.js",
  )
  const customController = path.join(
    projectDirectory,
    "cartridges",
    "app_custom",
    "cartridge",
    "controllers",
    "Product.js",
  )
  writeFile(
    baseController,
    [
      'const server = require("server")',
      'server.get("Show", renderProduct)',
      "module.exports = server.exports()",
    ].join("\n"),
  )
  writeFile(
    customController,
    [
      'const server = require("server")',
      "server.extend(module.superModule)",
      'server.prepend("Show", authorizeCustomer)',
      "module.exports = server.exports()",
    ].join("\n"),
  )

  const result = getProjectGraphDiff({
    cwd: projectDirectory,
    cartridgesDir: "cartridges",
    cartridgePath: "app_base",
    comparisonCartridgePath: "app_custom:app_base",
  })

  expect(result.baseline.cartridgeOrder).toEqual([
    path.join(projectDirectory, "cartridges", "app_base"),
  ])
  expect(result.comparison.cartridgeOrder).toEqual([
    path.join(projectDirectory, "cartridges", "app_custom"),
    path.join(projectDirectory, "cartridges", "app_base"),
  ])
  expect(result.nodes.added.map((node) => node.label)).toEqual(
    expect.arrayContaining([
      "app_custom",
      "app_custom/cartridge/controllers/Product.js",
      "authorizeCustomer",
    ]),
  )
  expect(result.edges.added).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "precedes" }),
      expect.objectContaining({ kind: "prepends" }),
      expect.objectContaining({ kind: "super-module" }),
    ]),
  )
})

test("impact follows the process relationships of a project file", () => {
  const projectDirectory = createProjectDirectory()
  const productController = path.join(
    projectDirectory,
    "cartridges",
    "app_custom",
    "cartridge",
    "controllers",
    "Product.js",
  )
  const searchController = path.join(
    projectDirectory,
    "cartridges",
    "app_custom",
    "cartridge",
    "controllers",
    "Search.js",
  )
  writeFile(
    productController,
    [
      'const server = require("server")',
      'server.get("Show", authorizeCustomer, renderProduct)',
      "module.exports = server.exports()",
    ].join("\n"),
  )
  writeFile(
    searchController,
    [
      'const server = require("server")',
      'server.get("Show", renderSearch)',
      "module.exports = server.exports()",
    ].join("\n"),
  )

  const result = getProjectImpact({
    cwd: projectDirectory,
    cartridgesDir: "cartridges",
    file: path.relative(projectDirectory, productController),
  })

  expect(result.file).toBe(productController)
  expect(result.nodes.map((node) => node.label)).toEqual([
    "app_custom/cartridge/controllers/Product.js",
    "GET Product-Show",
    "authorizeCustomer",
    "renderProduct",
  ])
  expect(result.nodes.some((node) => node.label === "GET Search-Show")).toBe(false)
})

describe("diagnoseProject", () => {
  test("reports missing configured cartridges", () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })

    const result = diagnoseProject({
      cwd: projectDirectory,
      cartridgesDir: "cartridges",
      cartridgePath: "app_custom:app_missing",
    })

    expect(result.ok).toBe(false)
    expect(result.findings).toContainEqual({
      level: "error",
      message: "Configured cartridge was not found: app_missing",
    })
  })

  test("reports a missing cartridges directory", () => {
    const projectDirectory = createProjectDirectory()
    const result = diagnoseProject({ cwd: projectDirectory, cartridgesDir: "cartridges" })

    expect(result.ok).toBe(false)
    expect(result.findings).toEqual([
      {
        level: "error",
        message: `Cartridges directory does not exist: ${path.join(projectDirectory, "cartridges")}`,
      },
    ])
  })

  test("warns about entries without a cartridge directory", () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom"), { recursive: true })

    const result = diagnoseProject({ cwd: projectDirectory, cartridgesDir: "cartridges" })

    expect(result.ok).toBe(true)
    expect(result.findings).toEqual([
      {
        level: "warning",
        message: "Cartridge has no cartridge directory: app_custom",
      },
    ])
  })

  test("accepts a valid cartridge project", () => {
    const projectDirectory = createProjectDirectory()
    fs.mkdirSync(path.join(projectDirectory, "cartridges", "app_custom", "cartridge"), {
      recursive: true,
    })

    expect(diagnoseProject({ cwd: projectDirectory, cartridgesDir: "cartridges" })).toMatchObject({
      ok: true,
      findings: [],
    })
  })
})

test("validateProject uses the effective cartridge order", () => {
  const projectDirectory = createProjectDirectory()
  const cartridgesDirectory = path.join(projectDirectory, "cartridges")
  const cartridgeRoot = path.join(cartridgesDirectory, "app_custom")
  writeFile(
    path.join(cartridgeRoot, "steptypes.json"),
    JSON.stringify({
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.Missing",
            module: "app_custom/cartridge/scripts/missing",
          },
        ],
      },
    }),
  )

  const result = validateProject({
    cwd: projectDirectory,
    cartridgesDir: "cartridges",
    cartridgePath: "app_custom",
  })

  expect(result.cartridgeOrder).toEqual([cartridgeRoot])
  expect(result.diagnostics).toEqual([
    expect.objectContaining({ code: "step-module-not-found", severity: "error" }),
  ])
})
