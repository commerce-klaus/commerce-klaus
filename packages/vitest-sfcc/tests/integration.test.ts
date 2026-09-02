import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import sfccVitest, { getSfccRuntime } from "../src/index.js"

describe("vitest-sfcc", () => {
  beforeEach(() => {
    vi.resetModules()
    getSfccRuntime().reset()
  })

  afterEach(() => {
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

  it("provides isolated SFCC globals to cartridge modules", async () => {
    getSfccRuntime().setGlobals({
      customer: { authenticated: true },
      request: { locale: "de_DE", querystring: { value: "" } },
      session: { custom: { id: "session-1" } },
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/global-subject.js")

    expect(subject.default()).toEqual({
      authenticated: true,
      empty: true,
      locale: "de_DE",
      sessionId: "session-1",
    })
  })

  it("registers and executes an SFRA controller route", async () => {
    const controller = await import("./cartridges/app_custom/cartridge/controllers/Test.js")
    const trace: string[] = []

    const response = await getSfccRuntime()
      .controller(controller.default)
      .run("Show", {
        querystring: { value: "request-value" },
        trace,
      })

    expect(response.view).toBe("test/show")
    expect(response.viewData).toEqual({ base: true, custom: true, first: "request-value" })
    expect(trace).toEqual(["prepend", "base", "append"])

    const jsonResponse = await getSfccRuntime()
      .controller(controller.default)
      .run("Submit", {
        form: { accepted: true },
      })
    expect(jsonResponse.isJson).toBe(true)
    expect(jsonResponse.viewData).toEqual({ accepted: true })
    expect(controller.default.__routes.Submit.method).toBe("POST")

    const replaceTrace: string[] = []
    const replacedResponse = await getSfccRuntime()
      .controller(controller.default)
      .run("Replace", { trace: replaceTrace })
    expect(replacedResponse.viewData).toEqual({ replaced: true })
    expect(replaceTrace).toEqual(["replacement"])

    const rawResponse = await getSfccRuntime().controller(controller.default).run("Raw")
    expect(rawResponse.contentType).toBe("text/xml")
    expect(rawResponse.statusCode).toBe(202)
    expect(rawResponse.printed).toEqual(["<sitemap />"])
  })

  it("marks relative dependencies resolved from transformed cartridge modules", () => {
    const plugin = sfccVitest({
      basePath: path.resolve(import.meta.dirname, "cartridges"),
      cartridgePath: ["app_custom", "app_base"],
    })
    const importer = `${path.resolve(
      import.meta.dirname,
      "cartridges/app_custom/cartridge/scripts/direct-exports.js",
    )}?vitest-sfcc-cjs`

    const resolvedId = plugin.resolveId("./relative-helper", importer)

    expect(resolvedId).toContain("vitest-sfcc:")
    expect(plugin.load(resolvedId!)).toContain("relative-helper.js?vitest-sfcc-cjs")
  })

  it("resolves and replaces cartridge aliases", async () => {
    getSfccRuntime().mock("app_base/cartridge/scripts/provider", {
      value: () => "alias-mocked",
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/alias-subject.js")

    expect(subject.default.execute()).toBe("alias-mocked")
  })

  it("replaces an extensionless relative cartridge dependency", async () => {
    getSfccRuntime().mock("./relative-helper", {
      value: () => "relative-mocked",
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/relative-subject.js")

    expect(subject.default.execute()).toBe("relative-mocked")
  })

  it("prefers a mock for the exact resolved relative dependency", async () => {
    const helperPath = path.resolve(
      import.meta.dirname,
      "cartridges/app_custom/cartridge/scripts/relative-helper.js",
    )
    getSfccRuntime().mock("./relative-helper", {
      value: () => "specifier-mocked",
    })
    getSfccRuntime().mockResolved(helperPath, {
      value: () => "resolved-mocked",
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/relative-subject.js")

    expect(subject.default.execute()).toBe("resolved-mocked")
  })

  it("loads direct named CommonJS exports", async () => {
    getSfccRuntime().mock("./relative-helper", {
      value: () => "export-mocked",
    })

    const subject = await import("./cartridges/app_custom/cartridge/scripts/direct-exports.js")

    expect(subject.execute("named")).toBe("named:export-mocked")
    expect(subject.label).toBe("direct")
    expect(subject.readInline()).toBe("export-mocked")
    expect(subject.readConstant()).toBe("export-mocked")
  })

  it("rejects mutable require aliases", () => {
    const plugin = sfccVitest({
      basePath: path.resolve(import.meta.dirname, "cartridges"),
      cartridgePath: ["app_custom", "app_base"],
    })
    const id = `${path.resolve(
      import.meta.dirname,
      "cartridges/app_custom/cartridge/scripts/dynamic-require.js",
    )}?vitest-sfcc-cjs`

    expect(() =>
      plugin.transform(
        'let helperId = "./relative-helper"\nmodule.exports = require(helperId)',
        id,
      ),
    ).toThrow(/cannot transform a dynamic require/)
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
