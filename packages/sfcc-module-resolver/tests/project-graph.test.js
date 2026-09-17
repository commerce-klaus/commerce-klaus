import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { createSfccProjectGraph } from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-project-graph-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function writeJson(filePath, content) {
  writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

test("createSfccProjectGraph maps cartridge precedence and transitive super modules", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const modulePath = path.join("cartridge", "models", "product.js")
    const customModule = path.join(cartridgesDir, "app_custom", modulePath)
    const coreModule = path.join(cartridgesDir, "app_core", modulePath)
    const baseModule = path.join(cartridgesDir, "app_base", modulePath)
    writeFile(customModule, "module.exports = module.superModule\n")
    writeFile(coreModule, "module.exports = module.superModule\n")
    writeFile(baseModule, "module.exports = {}\n")

    const graph = createSfccProjectGraph({
      cartridgesDir,
      cartridgePath: ["app_custom", "app_core", "app_base"],
    })

    expect(graph.cartridgeOrder).toEqual([
      path.join(cartridgesDir, "app_custom"),
      path.join(cartridgesDir, "app_core"),
      path.join(cartridgesDir, "app_base"),
    ])
    expect(graph.edges.filter((edge) => edge.kind === "precedes")).toHaveLength(2)
    expect(graph.edges.filter((edge) => edge.kind === "super-module")).toEqual([
      {
        from: `module:${customModule}`,
        kind: "super-module",
        to: `module:${coreModule}`,
      },
      {
        from: `module:${coreModule}`,
        kind: "super-module",
        to: `module:${baseModule}`,
      },
    ])
  })
})

test("createSfccProjectGraph maps contracts and supports a focused module graph", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const cartridgeRoot = path.join(cartridgesDir, "app_custom")
    const hookScript = path.join(cartridgeRoot, "cartridge", "scripts", "hooks", "order.js")
    const jobScript = path.join(cartridgeRoot, "cartridge", "scripts", "jobs", "feed.js")
    const apiDirectory = path.join(cartridgeRoot, "cartridge", "rest-apis", "loyalty-info")
    writeJson(path.join(cartridgeRoot, "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(path.join(cartridgeRoot, "cartridge", "scripts", "hooks.json"), {
      hooks: [{ name: "dw.order.calculate", script: "./hooks/order" }],
    })
    writeFile(hookScript, "exports.calculate = function () {}\n")
    writeFile(jobScript, "exports.run = function () {}\n")
    writeJson(path.join(cartridgeRoot, "steptypes.json"), {
      "step-types": {
        "script-module-step": [
          {
            "@type-id": "custom.GenerateFeed",
            function: "run",
            module: "app_custom/cartridge/scripts/jobs/feed",
          },
        ],
      },
    })
    writeJson(path.join(apiDirectory, "api.json"), {
      endpoints: [{ endpoint: "getLoyaltyInfo", implementation: "script", schema: "schema.yaml" }],
    })
    writeFile(
      path.join(apiDirectory, "schema.yaml"),
      [
        "openapi: 3.0.0",
        "info:",
        "  title: Loyalty API",
        "  version: 1.0.0",
        "paths:",
        "  /loyalty:",
        "    get:",
        "      operationId: getLoyaltyInfo",
        "      responses:",
        "        '200':",
        "          description: OK",
        "",
      ].join("\n"),
    )

    const graph = createSfccProjectGraph({ cartridgesDir })

    expect(graph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(["cartridge", "custom-api", "hook", "job-step", "module", "schema"]),
    )
    expect(graph.edges.map((edge) => edge.kind)).toEqual(
      expect.arrayContaining(["implements", "uses-schema"]),
    )

    const focused = createSfccProjectGraph({
      cartridgesDir,
      module: "*/cartridge/scripts/jobs/feed",
    })
    expect(focused.module).toBe("*/cartridge/scripts/jobs/feed")
    expect(focused.nodes.some((node) => node.path === jobScript)).toBe(true)
    expect(focused.nodes.some((node) => node.kind === "hook")).toBe(false)
  })
})

test("a focused graph connects wildcard candidates in override order", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const relativeModule = path.join("cartridge", "scripts", "example.js")
    const customModule = path.join(cartridgesDir, "app_custom", relativeModule)
    const baseModule = path.join(cartridgesDir, "app_base", relativeModule)
    writeFile(customModule, "module.exports = 'custom'\n")
    writeFile(baseModule, "module.exports = 'base'\n")

    const graph = createSfccProjectGraph({
      cartridgesDir,
      cartridgePath: ["app_custom", "app_base"],
      module: "*/cartridge/scripts/example",
    })

    expect(graph.edges).toContainEqual({
      from: `module:${customModule}`,
      kind: "overrides",
      to: `module:${baseModule}`,
    })
  })
})

test("createSfccProjectGraph rejects unsupported module forms", () => {
  expect(() =>
    createSfccProjectGraph({ cartridgesDir: "/missing", module: "~/cartridge/scripts/example" }),
  ).toThrow("--module must use the */cartridge/... module form")
})
