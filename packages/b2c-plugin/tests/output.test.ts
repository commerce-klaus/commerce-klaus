import { describe, expect, test } from "vite-plus/test"

import {
  renderDoctor,
  renderInspection,
  renderProjectImpact,
  renderProjectGraph,
  renderProjectGraphDiff,
  renderProjectGraphDot,
  renderProjectGraphMermaid,
  renderResolution,
  renderResolutionTrace,
  renderValidation,
  renderValidationSarif,
  type Colorize,
} from "../src/output.ts"

const colorize: Colorize = (style, text) => `<${style}>${text}</${style}>`

describe("renderProjectGraph", () => {
  const graph = {
    cartridgesDirectory: "/project/cartridges",
    cartridgeOrder: ["/project/cartridges/app_custom", "/project/cartridges/app_base"],
    nodes: [
      {
        id: "cartridge:/project/cartridges/app_custom",
        kind: "cartridge" as const,
        label: "app_custom",
        path: "/project/cartridges/app_custom",
      },
      {
        id: "cartridge:/project/cartridges/app_base",
        kind: "cartridge" as const,
        label: "app_base",
        path: "/project/cartridges/app_base",
      },
    ],
    edges: [
      {
        from: "cartridge:/project/cartridges/app_custom",
        kind: "precedes" as const,
        to: "cartridge:/project/cartridges/app_base",
      },
    ],
  }

  test("renders friendly colored relationship output", () => {
    const output = renderProjectGraph(graph, "/project", colorize)

    expect(output).toContain("Cartridges: <green>2 cartridges</green>")
    expect(output).toContain("app_custom <dim>--precedes--></dim> app_base")
    expect(output).toContain("<green>DONE</green>: Project graph generated.")
  })

  test("renders Graphviz DOT without terminal colors", () => {
    const output = renderProjectGraphDot({
      ...graph,
      nodes: [
        ...graph.nodes,
        { id: "route:Product:Show", kind: "route", label: "GET Product-Show" },
        { id: "http-endpoint:get:/products", kind: "http-endpoint", label: "GET /products" },
      ],
    })

    expect(output).toContain("digraph sfcc_project {")
    expect(output).toContain('[label="precedes"]')
    expect(output).toContain('[label="GET Product-Show", shape="oval"]')
    expect(output).toContain('[label="GET /products", shape="oval"]')
    expect(output).not.toContain("<green>")
  })

  test("renders deterministic Mermaid with escaped labels", () => {
    const output = renderProjectGraphMermaid({
      ...graph,
      nodes: [
        { ...graph.nodes[0], label: 'app "custom" & more' },
        graph.nodes[1],
        { id: "job-step:custom.Export", kind: "job-step", label: "custom.Export" },
        { id: "custom-api:getExample", kind: "custom-api", label: "getExample" },
        { id: "route:Product:Show", kind: "route", label: "GET Product-Show" },
        { id: "middleware:authorize", kind: "middleware", label: "authorizeCustomer" },
        { id: "http-endpoint:get:/products", kind: "http-endpoint", label: "GET /products" },
      ],
    })

    expect(output).toContain("flowchart LR")
    expect(output).toContain('n0["app &quot;custom&quot; &amp; more"]:::cartridge')
    expect(output).toContain('n2["custom.Export"]:::jobStep')
    expect(output).toContain('n3["getExample"]:::customApi')
    expect(output).toContain('n4["GET Product-Show"]:::route')
    expect(output).toContain('n5["authorizeCustomer"]:::middleware')
    expect(output).toContain('n6["GET /products"]:::httpEndpoint')
    expect(output).toContain("n0 -->|precedes| n1")
    expect(output).toContain("classDef cartridge fill:#d9e8f5")
    expect(output).not.toContain("cartridge:/project")
  })
})

describe("renderProjectGraphDiff", () => {
  test("renders cartridge paths and graph changes", () => {
    const baseline = {
      cartridgesDirectory: "/project/cartridges",
      cartridgeOrder: ["/project/cartridges/app_base"],
      nodes: [{ id: "route:Product:Show", kind: "route" as const, label: "GET Product-Show" }],
      edges: [],
    }
    const comparison = {
      ...baseline,
      cartridgeOrder: ["/project/cartridges/app_custom", "/project/cartridges/app_base"],
      nodes: [
        ...baseline.nodes,
        { id: "middleware:authorize", kind: "middleware" as const, label: "authorizeCustomer" },
      ],
      edges: [
        {
          from: "route:Product:Show",
          kind: "starts" as const,
          to: "middleware:authorize",
        },
      ],
    }
    const output = renderProjectGraphDiff(
      {
        baseline,
        comparison,
        nodes: { added: [comparison.nodes[1]], removed: [], changed: [] },
        edges: { added: comparison.edges, removed: [] },
      },
      "/project",
      colorize,
    )

    expect(output).toContain("Baseline: app_base")
    expect(output).toContain("Comparison: app_custom:app_base")
    expect(output).toContain("<green>+</green> middleware: authorizeCustomer")
    expect(output).toContain(
      "<green>+</green> GET Product-Show <dim>--starts--></dim> authorizeCustomer",
    )
    expect(output).toContain("<green>DONE</green>: Project graph comparison completed.")
  })
})

describe("renderProjectImpact", () => {
  test("renders source nodes and affected relationships", () => {
    const output = renderProjectImpact(
      {
        file: "/project/cartridges/app_custom/cartridge/controllers/Product.js",
        cartridgesDirectory: "/project/cartridges",
        cartridgeOrder: ["/project/cartridges/app_custom"],
        nodes: [
          {
            id: "module:Product.js",
            kind: "module",
            label: "app_custom/cartridge/controllers/Product.js",
            path: "/project/cartridges/app_custom/cartridge/controllers/Product.js",
          },
          { id: "route:Product:Show", kind: "route", label: "GET Product-Show" },
        ],
        edges: [
          {
            from: "module:Product.js",
            kind: "registers",
            to: "route:Product:Show",
          },
        ],
      },
      "/project",
      colorize,
    )

    expect(output).toContain(
      "Analyzing impact of <dim>cartridges/app_custom/cartridge/controllers/Product.js</dim>",
    )
    expect(output).toContain("module: app_custom/cartridge/controllers/Product.js (source)")
    expect(output).toContain("Product.js <dim>--registers--></dim> GET Product-Show")
    expect(output).toContain("<green>DONE</green>: Impact analysis completed.")
  })
})

describe("renderInspection", () => {
  test("renders counts and friendly empty states", () => {
    const output = renderInspection(
      {
        cartridgesDirectory: "/project/cartridges",
        cartridgeOrder: ["/project/cartridges/app_custom"],
        hooks: [],
        jobSteps: [],
        customApis: [],
      },
      "/project",
      colorize,
    )

    expect(output).toContain("Cartridges: <green>1 cartridge</green>")
    expect(output).toContain("Hooks: <yellow>none found</yellow>")
    expect(output).toContain("<green>DONE</green>: Project inspection completed.")
  })
})

describe("renderResolution", () => {
  test("highlights the winning module and completion state", () => {
    const output = renderResolution(
      {
        module: "*/cartridge/scripts/example",
        resolved: "/project/cartridges/app_custom/cartridge/scripts/example.js",
        cartridgeOrder: ["/project/cartridges/app_custom", "/project/cartridges/app_base"],
        candidates: [
          "/project/cartridges/app_custom/cartridge/scripts/example.js",
          "/project/cartridges/app_base/cartridge/scripts/example.js",
        ],
      },
      "/project",
      colorize,
    )

    expect(output).toContain(
      "Resolved: <green>cartridges/app_custom/cartridge/scripts/example.js</green>",
    )
    expect(output).toContain("<green>DONE</green>: Module resolution completed.")
  })

  test("renders a friendly miss when no module resolves", () => {
    const output = renderResolution(
      {
        module: "*/cartridge/scripts/missing",
        resolved: null,
        cartridgeOrder: [],
        candidates: [],
      },
      "/project",
      colorize,
    )

    expect(output).toContain("Resolved: <yellow>no matching module found</yellow>")
    expect(output).toContain("<yellow>MISS</yellow>: Module could not be resolved.")
  })
})

describe("renderResolutionTrace", () => {
  test("renders attempted paths and the matching candidate", () => {
    const output = renderResolutionTrace(
      {
        moduleName: "*/cartridge/models/product",
        kind: "wildcard",
        containingFile: "/project/cartridges/.klaus-entry.js",
        cartridgeOrder: ["/project/cartridges/app_custom"],
        attempts: [
          {
            cartridge: "/project/cartridges/app_custom",
            candidates: [
              "/project/cartridges/app_custom/cartridge/models/product",
              "/project/cartridges/app_custom/cartridge/models/product.js",
            ],
            resolved: "/project/cartridges/app_custom/cartridge/models/product.js",
          },
        ],
        resolved: "/project/cartridges/app_custom/cartridge/models/product.js",
      },
      "/project",
      colorize,
    )

    expect(output).toContain("Mode: wildcard")
    expect(output).toContain("<dim>MISS </dim>")
    expect(output).toContain("<green>MATCH</green>")
    expect(output).toContain("<green>DONE</green>: Resolution trace completed.")
  })
})

describe("renderDoctor", () => {
  test("renders warnings and errors with B2C CLI status colors", () => {
    const output = renderDoctor(
      {
        ok: false,
        cartridgesDirectory: "/project/cartridges",
        cartridgeOrder: [],
        findings: [
          { level: "warning", message: "Warning detail" },
          { level: "error", message: "Error detail" },
        ],
      },
      "/project",
      colorize,
    )

    expect(output).toContain("<yellow>WARN</yellow>: Warning detail")
    expect(output).toContain("<red>ERROR</red>: Error detail")
    expect(output).toContain("<red>FAIL</red>: Project configuration has errors.")
  })

  test("renders a passing project", () => {
    expect(
      renderDoctor(
        {
          ok: true,
          cartridgesDirectory: "/project/cartridges",
          cartridgeOrder: ["/project/cartridges/app_custom"],
          findings: [],
        },
        "/project",
        colorize,
      ),
    ).toContain("<green>PASS</green>: Project configuration looks valid.")
  })
})

describe("renderValidation", () => {
  test("renders diagnostics and a failing summary", () => {
    const output = renderValidation(
      {
        ok: false,
        errors: 1,
        warnings: 1,
        cartridgesDirectory: "/project/cartridges",
        cartridgeOrder: ["/project/cartridges/app_custom"],
        diagnostics: [
          {
            code: "hook-overridden",
            severity: "warning",
            file: "/project/cartridges/app_custom/hooks.json",
            message: "Hook is overridden.",
          },
          {
            code: "hook-script-not-found",
            severity: "error",
            file: "/project/cartridges/app_custom/hooks.json",
            message: "Hook script was not found.",
          },
        ],
      },
      "/project",
      colorize,
    )

    expect(output).toContain("<yellow>WARN</yellow> [hook-overridden]")
    expect(output).toContain("<red>ERROR</red> [hook-script-not-found]")
    expect(output).toContain("<red>FAIL</red>: Project validation found 1 error, 1 warning.")
  })

  test("renders portable SARIF 2.1.0 diagnostics", () => {
    const output = renderValidationSarif(
      {
        ok: false,
        errors: 1,
        warnings: 1,
        cartridgesDirectory: "/project/cartridges",
        cartridgeOrder: ["/project/cartridges/app_custom"],
        diagnostics: [
          {
            code: "hook-overridden",
            severity: "warning",
            file: "/project/cartridges/app custom/hooks.json",
            message: "Hook is overridden.",
          },
          {
            code: "hook-script-not-found",
            severity: "error",
            file: "/project/cartridges/app_custom/hooks.json",
            message: "Hook script was not found.",
          },
        ],
      },
      "/project",
    )
    const sarif = JSON.parse(output)

    expect(sarif).toMatchObject({
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "Commerce Klaus",
              rules: [{ id: "hook-overridden" }, { id: "hook-script-not-found" }],
            },
          },
          results: [
            {
              ruleId: "hook-overridden",
              level: "warning",
              message: { text: "Hook is overridden." },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: "cartridges/app%20custom/hooks.json" },
                  },
                },
              ],
            },
            {
              ruleId: "hook-script-not-found",
              level: "error",
            },
          ],
        },
      ],
    })
  })

  test("renders a successful summary", () => {
    expect(
      renderValidation(
        {
          ok: true,
          errors: 0,
          warnings: 0,
          cartridgesDirectory: "/project/cartridges",
          cartridgeOrder: [],
          diagnostics: [],
        },
        "/project",
        colorize,
      ),
    ).toContain("<green>PASS</green>: Project validation completed with 0 errors, 0 warnings.")
  })
})
