import { describe, expect, test } from "vite-plus/test"

import {
  renderDoctor,
  renderInspection,
  renderResolution,
  renderValidation,
  type Colorize,
} from "../src/output.ts"

const colorize: Colorize = (style, text) => `<${style}>${text}</${style}>`

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
