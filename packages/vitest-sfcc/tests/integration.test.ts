import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import sfccVitest, { getSfccRuntime, loadSfccJobStep } from "../src/index.js"

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

    const redirectResponse = await getSfccRuntime().controller(controller.default).run("Redirect")
    expect(redirectResponse.redirectUrl).toBe("/target")
    expect(redirectResponse.redirectStatus).toBe(301)
    expect(redirectResponse.headers).toEqual({ "X-Redirect-Source": "controller" })
    expect(redirectResponse.cachePeriod).toBe(2)
    expect(redirectResponse.messageLog).toEqual(['redirect {"permanent":true}'])
    expect(redirectResponse.viewData).toEqual({})
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

  it("leaves TypeScript files inside cartridge roots to Vite", () => {
    const plugin = sfccVitest({
      basePath: path.resolve(import.meta.dirname, "cartridges"),
      cartridgePath: ["app_custom", "app_base"],
    })
    const setupPath = path.resolve(import.meta.dirname, "cartridges/app_custom/test/setup.ts")

    expect(plugin.resolveId(setupPath)).toBeUndefined()
  })

  it("leaves JavaScript files outside cartridge roots to Vite", () => {
    const plugin = sfccVitest({
      basePath: path.resolve(import.meta.dirname, "cartridges"),
      cartridgePath: ["app_custom", "app_base"],
    })
    const applicationPath = path.resolve(import.meta.dirname, "application-module.js")

    expect(plugin.resolveId(applicationPath)).toBeUndefined()
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

  it("does not evaluate a cartridge fallback when its module is mocked", async () => {
    getSfccRuntime().mock("./unloadable-helper", { value: () => "mocked" })

    const subject = await vi.importActual<{
      default: { execute: () => string }
    }>("./cartridges/app_custom/cartridge/scripts/lazy-subject.js")

    expect(subject.default.execute()).toBe("mocked")
  })

  it("does not evaluate a function-local require before the function is called", async () => {
    const subject = await vi.importActual<{
      default: { load: () => string; ready: () => boolean }
    }>("./cartridges/app_custom/cartridge/scripts/function-local-require.js")

    expect(subject.default.ready()).toBe(true)
    getSfccRuntime().mock("./unloadable-helper", { value: () => "late-mocked" })
    expect(subject.default.load()).toBe("late-mocked")
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

  it("loads named CommonJS exports through a lazy cartridge fallback", async () => {
    getSfccRuntime().mock("./relative-helper", {
      value: () => "fallback-mocked",
    })

    const subject = await vi.importActual<{
      default: { execute: (prefix: string) => string }
    }>("./cartridges/app_custom/cartridge/scripts/direct-exports.js")

    expect(subject.default.execute("named")).toBe("named:fallback-mocked")
  })

  it("runs a transformed script-module job step", async () => {
    const jobModule = await import("./cartridges/app_custom/cartridge/scripts/job-step.js")
    const jobStep = getSfccRuntime().jobStep(jobModule, { context: { executions: 1 } })

    await expect(jobStep.run("Run", { prefix: "feed" })).resolves.toBe("feed:2")
    await expect(jobStep.run("Run", { prefix: "feed" })).resolves.toBe("feed:3")
    expect(jobStep.jobExecution.context).toEqual({ executions: 3 })
  })

  it("runs a transformed chunk job step lifecycle", async () => {
    const chunkModule = await import("./cartridges/app_custom/cartridge/scripts/chunk-job-step.js")
    const jobStep = getSfccRuntime().jobStep(chunkModule, { context: { batches: [] } })

    await expect(
      jobStep.runChunk({
        chunkSize: 2,
        functions: {
          afterChunk: "completeChunk",
          afterStep: "finish",
          beforeChunk: "startChunk",
          beforeStep: "prepare",
          getTotalCount: "count",
          process: "transform",
          read: "readNext",
          write: "writeBatch",
        },
        parameters: { items: [1, 2, 3], multiplier: 3 },
      }),
    ).resolves.toEqual({
      afterStepResult: "OK",
      chunkCount: 2,
      processedCount: 3,
      readCount: 3,
      totalCount: 3,
      writtenCount: 3,
    })
    expect(jobStep.jobExecution.context).toEqual({
      batches: [[3, 6], [9]],
      chunks: 2,
      startedChunks: 2,
    })
  })

  it("loads and runs a script-module job step by type ID", async () => {
    const jobStep = await loadSfccJobStep("custom.TestTask", {
      context: { executions: 1 },
    })

    await expect(jobStep.run({ Prefix: "  feed  " })).resolves.toEqual({
      DryRun: true,
      Prefix: "feed",
      RetryCount: 3,
    })
    expect(jobStep.definition).toMatchObject({
      functionName: "Parameters",
      kind: "script-module-step",
    })
    expect(jobStep.stepExecution.getStepTypeID()).toBe("custom.TestTask")
    expect(jobStep.jobExecution.context).toEqual({
      executions: 1,
      parameters: { DryRun: true, Prefix: "feed", RetryCount: 3 },
    })
  })

  it("loads and runs a chunk job step by type ID", async () => {
    const jobStep = await loadSfccJobStep("custom.TestChunk", {
      context: { batches: [] },
    })

    await expect(jobStep.run({ items: [1, 2, 3] })).resolves.toMatchObject({
      afterStepResult: { code: "OK" },
      chunkCount: 2,
      totalCount: 3,
      writtenCount: 3,
    })
    expect(jobStep.definition).toMatchObject({
      chunkSize: 2,
      kind: "chunk-script-module-step",
    })
    expect(jobStep.jobExecution.context.batches).toEqual([[2, 4], [6]])
    await expect(jobStep.run({ items: [], StatusCode: "UNKNOWN" })).rejects.toThrow(
      "SFCC job step custom.TestChunk returned undeclared status code UNKNOWN. Expected one of: OK.",
    )
  })

  it("rejects an unknown job step type ID", async () => {
    await expect(loadSfccJobStep("custom.Missing")).rejects.toThrow(
      "vitest-sfcc could not find an SFCC job step with type ID custom.Missing.",
    )
  })

  it("validates configured job step parameters", async () => {
    const jobStep = await loadSfccJobStep("custom.TestTask")

    await expect(jobStep.run()).rejects.toThrow(
      "SFCC job step custom.TestTask requires parameter Prefix.",
    )
    await expect(jobStep.run({ DryRun: "yes", Prefix: "feed" })).rejects.toThrow(
      "SFCC job step custom.TestTask parameter DryRun must be a boolean.",
    )
    await expect(jobStep.run({ Prefix: "feed", RetryCount: 1.5 })).rejects.toThrow(
      "SFCC job step custom.TestTask parameter RetryCount must be a long.",
    )
  })

  it("validates status-like job step results against declared codes", async () => {
    const jobStep = await loadSfccJobStep("custom.TestStatus")

    await expect(jobStep.run({ Code: "OK" })).resolves.toEqual({ code: "OK" })
    await expect(jobStep.run({ Code: "WARN", UseGetter: true })).resolves.toMatchObject({
      getCode: expect.any(Function),
    })
    await expect(jobStep.run({ Code: "UNKNOWN" })).rejects.toThrow(
      "SFCC job step custom.TestStatus returned undeclared status code UNKNOWN. Expected one of: OK, WARN.",
    )
  })

  it("allows status-like results without declared status codes", async () => {
    const jobStep = await loadSfccJobStep("custom.TestStatusWithoutCodes")

    await expect(jobStep.run({ Code: "CUSTOM" })).resolves.toEqual({ code: "CUSTOM" })
  })

  it("times out a script-module job step from its type definition", async () => {
    const jobStep = await loadSfccJobStep("custom.TestTimeout")
    vi.useFakeTimers()

    try {
      const result = expect(jobStep.run({ DelayMs: 2_000 })).rejects.toThrow(
        "SFCC job step custom.TestTimeout timed out after 1 second.",
      )
      await vi.advanceTimersByTimeAsync(1_000)
      await result
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
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
