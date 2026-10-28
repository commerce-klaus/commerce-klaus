import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, requireSfccModule, setSfccTestRuntime } from "../src/index.js"

describe("SFCC module registry", () => {
  const runtime = createSfccTestRuntime({
    site: { id: "RefArch", preferences: { reviewsEnabled: true } },
  })

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
  })

  it("uses a registered module instead of its fallback", () => {
    runtime.mock("*/cartridge/scripts/provider", { value: "mocked" })

    expect(runtime.hasModuleMock("*/cartridge/scripts/provider")).toBe(true)
    expect(requireSfccModule("*/cartridge/scripts/provider", () => ({ value: "real" }))).toEqual({
      value: "mocked",
    })
  })

  it("matches an extensionless mock to an SFCC module with a script extension", () => {
    runtime.mock("~/cartridge/scripts/provider", { value: "mocked" })

    expect(runtime.hasModuleMock("~/cartridge/scripts/provider.js")).toBe(true)
    expect(requireSfccModule("~/cartridge/scripts/provider.js", () => ({ value: "real" }))).toEqual(
      { value: "mocked" },
    )
    expect(requireSfccModule("~/cartridge/scripts/provider.ds", () => ({ value: "real" }))).toEqual(
      { value: "mocked" },
    )
    expect(
      requireSfccModule("~/cartridge/scripts/provider.json", () => ({ value: "real" })),
    ).toEqual({ value: "mocked" })
  })

  it("matches a script-extension mock to an extensionless SFCC module", () => {
    runtime.mock("~/cartridge/scripts/provider.js", { value: "mocked" })

    expect(requireSfccModule("~/cartridge/scripts/provider", () => ({ value: "real" }))).toEqual({
      value: "mocked",
    })
  })

  it("prefers an exact module mock when extension variants are also registered", () => {
    runtime.mock("~/cartridge/scripts/provider", { value: "extensionless" })
    runtime.mock("~/cartridge/scripts/provider.js", { value: "javascript" })

    expect(requireSfccModule("~/cartridge/scripts/provider.js")).toEqual({
      value: "javascript",
    })
    expect(requireSfccModule("~/cartridge/scripts/provider")).toEqual({
      value: "extensionless",
    })
  })

  it("restores fallback resolution on reset", () => {
    runtime.mock("*/cartridge/scripts/provider", { value: "mocked" })
    runtime.reset()

    expect(runtime.hasModuleMock("*/cartridge/scripts/provider")).toBe(false)
    expect(requireSfccModule("*/cartridge/scripts/provider", () => ({ value: "real" }))).toEqual({
      value: "real",
    })
  })

  it("prefers an exact resolved mock and removes it on reset", () => {
    runtime.mock("./provider", { value: "specifier" })
    runtime.mockResolved("/cartridges/app_custom/provider.js", { value: "resolved" })

    expect(
      requireSfccModule(
        "./provider",
        () => ({ value: "real" }),
        "/cartridges/app_custom/provider.js",
      ),
    ).toEqual({ value: "resolved" })

    runtime.reset()

    expect(
      requireSfccModule(
        "./provider",
        () => ({ value: "real" }),
        "/cartridges/app_custom/provider.js",
      ),
    ).toEqual({ value: "real" })
  })

  it("provides isolated transaction, logger, and site modules", () => {
    const Transaction = requireSfccModule("dw/system/Transaction") as {
      wrap: <Result>(callback: () => Result) => Result
    }
    const Logger = requireSfccModule("dw/system/Logger") as {
      warn: (message: string, ...parameters: unknown[]) => void
    }
    const Site = requireSfccModule("dw/system/Site") as {
      getCurrent: () => { ID: string; getCustomPreferenceValue: (name: string) => unknown }
    }

    expect(Transaction.wrap(() => "result")).toBe("result")
    Logger.warn("Failed {0}", "payment")

    expect(runtime.transactionCalls).toEqual(["wrap"])
    expect(runtime.loggerEntries).toEqual([
      { level: "warn", message: "Failed {0}", parameters: ["payment"] },
    ])
    expect(Site.getCurrent().ID).toBe("RefArch")
    expect(Site.getCurrent().getCustomPreferenceValue("reviewsEnabled")).toBe(true)
  })
})
