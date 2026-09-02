import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, requireSfccModule, setSfccTestRuntime } from "../src/index.js"

describe("SFCC test runtime", () => {
  const runtime = createSfccTestRuntime({
    site: { id: "RefArch", preferences: { reviewsEnabled: true } },
  })

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
  })

  it("uses a registered module instead of its fallback", () => {
    runtime.mock("*/cartridge/scripts/provider", { value: "mocked" })

    expect(requireSfccModule("*/cartridge/scripts/provider", () => ({ value: "real" }))).toEqual({
      value: "mocked",
    })
  })

  it("restores fallback resolution on reset", () => {
    runtime.mock("*/cartridge/scripts/provider", { value: "mocked" })
    runtime.reset()

    expect(requireSfccModule("*/cartridge/scripts/provider", () => ({ value: "real" }))).toEqual({
      value: "real",
    })
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
