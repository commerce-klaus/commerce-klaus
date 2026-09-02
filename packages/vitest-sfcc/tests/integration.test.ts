import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getSfccRuntime } from "../src/index.js"

describe("vitest-sfcc", () => {
  beforeEach(() => {
    vi.resetModules()
    getSfccRuntime().reset()
  })

  it("replaces a cartridge dependency while providing dw runtime modules", async () => {
    getSfccRuntime().mock("*/cartridge/scripts/provider", {
      value: () => "mocked",
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/subject.js")

    expect(subject.default.execute()).toBe("mocked")
    expect(getSfccRuntime().transactionCalls).toEqual(["wrap"])
  })

  it("resolves and replaces cartridge aliases", async () => {
    getSfccRuntime().mock("app_base/cartridge/scripts/provider", {
      value: () => "alias-mocked",
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/alias-subject.js")

    expect(subject.default.execute()).toBe("alias-mocked")
  })

  it("loads module.superModule from the next cartridge", async () => {
    const inherited = await import("./cartridges/app_custom/cartridge/scripts/inherited.js")

    expect(inherited.default.value()).toBe("custom:base")
  })

  it("discovers and calls the first registered hook in cartridge order", async () => {
    const subject = await import("./cartridges/app_custom/cartridge/scripts/hook-subject.js")

    expect(subject.default.execute("payment-1")).toBe("custom:payment-1")
    expect(getSfccRuntime().hookCalls).toEqual([
      {
        extensionPoint: "app.payment.authorize",
        functionName: "authorize",
        args: ["payment-1"],
      },
    ])
  })
})
