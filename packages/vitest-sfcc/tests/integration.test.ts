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
})
