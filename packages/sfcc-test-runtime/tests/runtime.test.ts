import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createSfccTestRuntime,
  requireSfccModule,
  setSfccTestRuntime,
  type SfccController,
} from "../src/index.js"

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

  it("stops controller middleware that does not call next", async () => {
    const calls: string[] = []
    const controller: SfccController = {
      __routes: {
        Stop: {
          method: "GET",
          name: "Stop",
          middleware: [() => calls.push("stop"), () => calls.push("unreachable")],
        },
      },
    }

    await runtime.controller(controller).run("Stop")

    expect(calls).toEqual(["stop"])
  })

  it("rejects next errors without running later middleware", async () => {
    const calls: string[] = []
    const controller: SfccController = {
      __routes: {
        Failure: {
          method: "GET",
          name: "Failure",
          middleware: [
            (_request, _response, next) => next(new Error("route failed")),
            () => calls.push("unreachable"),
          ],
        },
      },
    }

    await expect(runtime.controller(controller).run("Failure")).rejects.toThrow("route failed")
    expect(calls).toEqual([])
  })

  it("rejects middleware that calls next more than once", async () => {
    const controller: SfccController = {
      __routes: {
        Duplicate: {
          method: "GET",
          name: "Duplicate",
          middleware: [
            async (_request, _response, next) => {
              await next()
              await next()
            },
          ],
        },
      },
    }

    await expect(runtime.controller(controller).run("Duplicate")).rejects.toThrow(
      /called next\(\) more than once/,
    )
  })

  it("runs a script-module job step with parameters and execution context", async () => {
    const context = { runs: 2 }
    const jobStep = runtime.jobStep(
      {
        Run: (
          parameters: Record<string, unknown>,
          stepExecution: {
            getJobExecution: () => { context: Record<string, unknown> }
          },
        ) => {
          const jobExecution = stepExecution.getJobExecution()
          jobExecution.context.runs = Number(jobExecution.context.runs ?? 0) + 1
          return `${String(parameters.prefix)}:${String(jobExecution.context.runs)}`
        },
      },
      {
        context,
        jobExecutionId: "job-execution-1",
        jobId: "NightlyFeed",
        stepExecutionId: "step-execution-1",
        stepId: "GenerateFeed",
        stepTypeId: "custom.GenerateFeed",
      },
    )

    await expect(jobStep.run("Run", { prefix: "feed" })).resolves.toBe("feed:3")
    await expect(jobStep.run("Run", { prefix: "feed" })).resolves.toBe("feed:4")
    expect(jobStep.jobExecution.context).toBe(context)
    expect(jobStep.jobExecution.context).toEqual({ runs: 4 })
    expect(jobStep.jobExecution.context.get("runs")).toBe(4)
    expect(jobStep.jobExecution.context.containsKey("runs")).toBe(true)
    expect(jobStep.jobExecution.context.containsValue(4)).toBe(true)
    expect(jobStep.jobExecution.context.isEmpty()).toBe(false)
    expect(jobStep.jobExecution.context.size()).toBe(1)
    expect(jobStep.jobExecution.context.getLength()).toBe(1)
    expect(jobStep.jobExecution.context).toMatchObject({ empty: false, length: 1 })
    jobStep.jobExecution.context.put("fileName", "feed.xml")
    expect(jobStep.jobExecution.context.fileName).toBe("feed.xml")
    expect(jobStep.jobExecution.context.remove("fileName")).toBe("feed.xml")
    expect(jobStep.jobExecution.context.get("fileName")).toBeNull()
    expect(jobStep.jobExecution.getContext()).toBe(jobStep.jobExecution.context)
    expect(jobStep.jobExecution.getID()).toBe("job-execution-1")
    expect(jobStep.jobExecution.getJobID()).toBe("NightlyFeed")
    expect(jobStep.jobExecution).toMatchObject({
      ID: "job-execution-1",
      jobID: "NightlyFeed",
    })
    expect(jobStep.stepExecution.getJobExecution()).toBe(jobStep.jobExecution)
    expect(jobStep.stepExecution.getID()).toBe("step-execution-1")
    expect(jobStep.stepExecution.getStepID()).toBe("GenerateFeed")
    expect(jobStep.stepExecution.getStepTypeID()).toBe("custom.GenerateFeed")
    expect(jobStep.stepExecution).toMatchObject({
      ID: "step-execution-1",
      jobExecution: jobStep.jobExecution,
      stepID: "GenerateFeed",
      stepTypeID: "custom.GenerateFeed",
    })
    expect(() => runtime.jobStep({}, { context })).not.toThrow()
    jobStep.jobExecution.context.clear()
    expect(jobStep.jobExecution.context).toMatchObject({ empty: true, length: 0 })
  })

  it("rejects a missing script-module job step function", async () => {
    const jobStep = runtime.jobStep({ execute: "not callable" })

    await expect(jobStep.run("execute")).rejects.toThrow(
      "SFCC job step does not export function execute.",
    )
  })

  it("runs a chunk job step lifecycle and filters null process results", async () => {
    const trace: string[] = []
    const source = [1, 2, 3]
    const written: number[][] = []
    const jobStep = runtime.jobStep({
      beforeStep: (parameters: Record<string, unknown>) =>
        trace.push(`beforeStep:${String(parameters.prefix)}`),
      getTotalCount: () => {
        trace.push("getTotalCount")
        return source.length
      },
      beforeChunk: () => trace.push("beforeChunk"),
      read: () => {
        const item = source.shift()
        trace.push(`read:${String(item)}`)
        return item
      },
      process: (item: number) => {
        trace.push(`process:${item}`)
        return item === 3 ? null : item * 2
      },
      write: (items: {
        get: (index: number) => number
        isEmpty: () => boolean
        size: () => number
        toArray: () => number[]
      }) => {
        expect(items.isEmpty()).toBe(false)
        expect(items.get(1)).toBe(4)
        expect(items.size()).toBe(2)
        written.push(items.toArray())
        trace.push("write")
      },
      afterChunk: () => trace.push("afterChunk"),
      afterStep: (successful: boolean) => {
        trace.push(`afterStep:${successful}`)
        return "finished"
      },
    })

    await expect(
      jobStep.runChunk({ chunkSize: 2, parameters: { prefix: "feed" } }),
    ).resolves.toEqual({
      afterStepResult: "finished",
      chunkCount: 2,
      processedCount: 2,
      readCount: 3,
      totalCount: 3,
      writtenCount: 2,
    })
    expect(written).toEqual([[2, 4]])
    expect(trace).toEqual([
      "beforeStep:feed",
      "getTotalCount",
      "beforeChunk",
      "read:1",
      "process:1",
      "read:2",
      "process:2",
      "write",
      "afterChunk",
      "beforeChunk",
      "read:3",
      "process:3",
      "read:undefined",
      "afterChunk",
      "afterStep:true",
    ])
  })

  it("runs afterStep with a failed chunk lifecycle", async () => {
    const afterStep = vi.fn()
    const jobStep = runtime.jobStep({
      read: () => "item",
      process: () => {
        throw new Error("processing failed")
      },
      write: () => undefined,
      afterStep,
    })

    await expect(jobStep.runChunk({ chunkSize: 1 })).rejects.toThrow("processing failed")
    expect(afterStep).toHaveBeenCalledWith(false, {}, jobStep.stepExecution)
  })

  it("validates chunk size and required lifecycle functions", async () => {
    await expect(runtime.jobStep({}).runChunk({ chunkSize: 0 })).rejects.toThrow(
      "SFCC chunk job step requires a positive integer chunk size.",
    )
    await expect(
      runtime.jobStep({ write: () => undefined }).runChunk({ chunkSize: 1 }),
    ).rejects.toThrow("SFCC job step does not export function read.")
    await expect(
      runtime
        .jobStep({ read: () => undefined, write: () => undefined })
        .runChunk({ chunkSize: 1, functions: { beforeStep: "prepare" } }),
    ).rejects.toThrow("SFCC job step does not export function prepare.")
    await expect(
      runtime
        .jobStep({ read: () => undefined, write: () => undefined, getTotalCount: () => "3" })
        .runChunk({ chunkSize: 1 }),
    ).rejects.toThrow("SFCC chunk job step getTotalCount() must return a non-negative number.")
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
