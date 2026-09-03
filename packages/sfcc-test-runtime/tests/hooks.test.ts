import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, requireSfccModule, setSfccTestRuntime } from "../src/index.js"

describe("SFCC hooks runtime", () => {
  const runtime = createSfccTestRuntime()

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
  })

  it("executes the first registered hook and records its arguments", () => {
    runtime.registerHook("app.payment.authorize", {
      authorize: (paymentId: unknown) => `authorized:${String(paymentId)}`,
    })
    runtime.registerHook("app.payment.authorize", {
      authorize: () => "lower-priority",
    })
    const HookMgr = requireSfccModule("dw/system/HookMgr") as {
      hasHook: (extensionPoint: string) => boolean
      callHook: (extensionPoint: string, functionName: string, ...args: unknown[]) => unknown
    }

    expect(HookMgr.hasHook("app.payment.authorize")).toBe(true)
    expect(HookMgr.callHook("app.payment.authorize", "authorize", "payment-1")).toBe(
      "authorized:payment-1",
    )
    expect(runtime.hookCalls).toEqual([
      {
        extensionPoint: "app.payment.authorize",
        functionName: "authorize",
        args: ["payment-1"],
      },
    ])
  })

  it("returns undefined for an unavailable hook function", () => {
    runtime.registerHook("app.payment.authorize", {})

    expect(runtime.callHook("app.payment.authorize", "missing")).toBeUndefined()
    expect(runtime.callHook("app.payment.missing", "authorize")).toBeUndefined()
  })
})
