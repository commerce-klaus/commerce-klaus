import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, setSfccTestRuntime } from "../src/index.js"

describe("SFCC globals runtime", () => {
  const runtime = createSfccTestRuntime()

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
  })

  it("installs globals and restores their original descriptors on reset", () => {
    const testGlobal = globalThis as typeof globalThis & {
      __sfccRequest?: unknown
      __sfccSession?: unknown
    }
    Object.defineProperty(testGlobal, "__sfccSession", {
      configurable: true,
      enumerable: false,
      value: "original",
      writable: false,
    })
    const originalSession = Object.getOwnPropertyDescriptor(testGlobal, "__sfccSession")

    runtime.setGlobals({
      __sfccRequest: { locale: "de_DE" },
      __sfccSession: { privacy: {} },
    })
    runtime.setGlobals({ __sfccRequest: { locale: "en_US" } })

    expect(testGlobal.__sfccRequest).toEqual({ locale: "en_US" })
    expect(testGlobal.__sfccSession).toEqual({ privacy: {} })

    runtime.reset()

    expect("__sfccRequest" in testGlobal).toBe(false)
    expect(Object.getOwnPropertyDescriptor(testGlobal, "__sfccSession")).toEqual(originalSession)
    Reflect.deleteProperty(testGlobal, "__sfccSession")
  })

  it("rejects non-configurable globals without applying partial changes", () => {
    const testGlobal = globalThis as typeof globalThis & { __sfccRequest?: unknown }

    expect(() => runtime.setGlobals({ __sfccRequest: {}, Infinity: 1 })).toThrow(
      /cannot override non-configurable global Infinity/,
    )
    expect("__sfccRequest" in testGlobal).toBe(false)
  })

  it.each([
    [undefined, true],
    [null, true],
    ["", true],
    [[], true],
    [{ isEmpty: () => true }, true],
    [false, false],
    [0, false],
    [" ", false],
    [[0], false],
    [{}, false],
    [{ empty: true }, false],
    [{ length: 0 }, false],
    [{ size: 0 }, false],
    [{ isEmpty: () => false }, false],
  ])("implements SFCC empty() for %j", (value, expected) => {
    const sfccGlobal = globalThis as typeof globalThis & {
      empty: (candidate: unknown) => boolean
    }

    expect(sfccGlobal.empty(value)).toBe(expected)
  })

  it("restores the default empty() implementation on reset", () => {
    const sfccGlobal = globalThis as typeof globalThis & {
      empty: (candidate: unknown) => boolean
    }
    runtime.setGlobals({ empty: () => false })

    expect(sfccGlobal.empty("")).toBe(false)
    runtime.reset()

    expect(sfccGlobal.empty("")).toBe(true)
  })
})
