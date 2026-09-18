import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  createSfccProjectGraph,
  diffSfccProjectGraphs,
  filterSfccProjectGraph,
} from "../src/index.ts"

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

test("filterSfccProjectGraph traverses focused relationships by direction and depth", () => {
  const graph = {
    cartridgesDirectory: "/project/cartridges",
    cartridgeOrder: [],
    nodes: [
      { id: "route:Product:Show", kind: "route", label: "GET Product-Show" },
      { id: "middleware:authorize", kind: "middleware", label: "authorizeCustomer" },
      { id: "middleware:render", kind: "middleware", label: "renderProduct" },
      { id: "module:Product.js", kind: "module", label: "Product.js", path: "/project/Product.js" },
      { id: "route:Product:Search", kind: "route", label: "GET Product-Search" },
    ],
    edges: [
      { from: "module:Product.js", kind: "registers", to: "route:Product:Show" },
      { from: "route:Product:Show", kind: "starts", to: "middleware:authorize" },
      { from: "middleware:authorize", kind: "next", to: "middleware:render" },
      { from: "module:Product.js", kind: "registers", to: "route:Product:Search" },
    ],
  }

  expect(filterSfccProjectGraph(graph, { focus: "product-show" })).toMatchObject({
    nodes: [
      { id: "route:Product:Show" },
      { id: "middleware:authorize" },
      { id: "middleware:render" },
    ],
    edges: [
      { from: "route:Product:Show", kind: "starts", to: "middleware:authorize" },
      { from: "middleware:authorize", kind: "next", to: "middleware:render" },
    ],
  })
  expect(
    filterSfccProjectGraph(graph, {
      focus: "authorizecustomer",
      depth: 1,
      direction: "dependents",
    }).nodes.map((node) => node.id),
  ).toEqual(["route:Product:Show", "middleware:authorize"])
  expect(
    filterSfccProjectGraph(graph, { focus: "/project/Product.js", depth: 1 }).nodes.map(
      (node) => node.id,
    ),
  ).toEqual(["route:Product:Show", "module:Product.js", "route:Product:Search"])
})

test("diffSfccProjectGraphs reports deterministic graph changes", () => {
  const sharedNode = { id: "route:Product:Show", kind: "route", label: "GET Product-Show" }
  const baseline = {
    cartridgesDirectory: "/project/cartridges",
    cartridgeOrder: ["/project/cartridges/app_base"],
    nodes: [
      sharedNode,
      { id: "middleware:render", kind: "middleware", label: "renderProduct" },
      { id: "hook:example", kind: "hook", label: "example.before" },
    ],
    edges: [
      { from: sharedNode.id, kind: "starts", to: "middleware:render" },
      { from: "hook:example", kind: "implements", to: "module:hook" },
    ],
  }
  const comparison = {
    cartridgesDirectory: "/project/cartridges",
    cartridgeOrder: ["/project/cartridges/app_custom", "/project/cartridges/app_base"],
    nodes: [
      sharedNode,
      { id: "middleware:render", kind: "middleware", label: "renderCustomizedProduct" },
      { id: "middleware:authorize", kind: "middleware", label: "authorizeCustomer" },
    ],
    edges: [
      { from: sharedNode.id, kind: "starts", to: "middleware:authorize" },
      { from: "middleware:authorize", kind: "next", to: "middleware:render" },
    ],
  }

  const result = diffSfccProjectGraphs(baseline, comparison)

  expect(result.nodes.added).toEqual([comparison.nodes[2]])
  expect(result.nodes.removed).toEqual([baseline.nodes[2]])
  expect(result.nodes.changed).toEqual([{ before: baseline.nodes[1], after: comparison.nodes[1] }])
  expect(result.edges.added).toEqual(comparison.edges)
  expect(result.edges.removed).toEqual(baseline.edges)
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
    writeFile(path.join(apiDirectory, "script.js"), "exports.getLoyaltyInfo = function () {}\n")
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
    expect(graph.edges).toContainEqual({
      from: `custom-api:${path.join(apiDirectory, "api.json")}#getLoyaltyInfo`,
      kind: "implements",
      to: `module:${path.join(apiDirectory, "script.js")}`,
    })
    expect(graph.edges).toContainEqual({
      from: `http-endpoint:${path.join(apiDirectory, "schema.yaml")}#get:/loyalty`,
      kind: "invokes",
      to: `custom-api:${path.join(apiDirectory, "api.json")}#getLoyaltyInfo`,
    })

    const focused = createSfccProjectGraph({
      cartridgesDir,
      module: "*/cartridge/scripts/jobs/feed",
    })
    expect(focused.module).toBe("*/cartridge/scripts/jobs/feed")
    expect(focused.nodes.some((node) => node.path === jobScript)).toBe(true)
    expect(focused.nodes.some((node) => node.kind === "hook")).toBe(false)
  })
})

test("createSfccProjectGraph maps SFRA controller route customization", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const customController = path.join(
      cartridgesDir,
      "app_custom",
      "cartridge",
      "controllers",
      "Product.js",
    )
    const baseController = path.join(
      cartridgesDir,
      "app_base",
      "cartridge",
      "controllers",
      "Product.js",
    )
    writeFile(
      customController,
      [
        'const server = require("server")',
        "server.extend(module.superModule)",
        'server.prepend("Show", authorizeCustomer)',
        'server.append("Show", addRecommendations)',
        'server.replace("Search", searchProducts)',
        "module.exports = server.exports()",
      ].join("\n"),
    )
    writeFile(
      baseController,
      [
        'const server = require("server")',
        'const dynamicRoute = "Dynamic"',
        'server.get("Show", showProduct)',
        'server.get("Search", searchProducts)',
        "server.get(dynamicRoute, dynamicHandler)",
        "module.exports = server.exports()",
      ].join("\n"),
    )

    const graph = createSfccProjectGraph({
      cartridgesDir,
      cartridgePath: ["app_custom", "app_base"],
    })

    expect(graph.nodes).toContainEqual({
      id: "route:Product:Show",
      kind: "route",
      label: "GET Product-Show",
    })
    expect(graph.nodes.some((node) => node.id === "route:Product:Dynamic")).toBe(false)
    const showPipeline = graph.edges
      .filter((edge) => edge.kind === "starts" || edge.kind === "next")
      .map((edge) => [
        graph.nodes.find((node) => node.id === edge.from)?.label,
        edge.kind,
        graph.nodes.find((node) => node.id === edge.to)?.label,
      ])
    expect(showPipeline).toEqual(
      expect.arrayContaining([
        ["GET Product-Show", "starts", "authorizeCustomer"],
        ["authorizeCustomer", "next", "showProduct"],
        ["showProduct", "next", "addRecommendations"],
        ["GET Product-Search", "starts", "searchProducts"],
      ]),
    )
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        {
          from: `module:${baseController}`,
          kind: "registers",
          to: "route:Product:Show",
        },
        {
          from: `module:${customController}`,
          kind: "prepends",
          to: "route:Product:Show",
        },
        {
          from: `module:${customController}`,
          kind: "appends",
          to: "route:Product:Show",
        },
        {
          from: `module:${customController}`,
          kind: "replaces",
          to: "route:Product:Search",
        },
      ]),
    )
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
