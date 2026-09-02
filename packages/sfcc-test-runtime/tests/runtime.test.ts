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

  it("provides an SFCC-like status with getters, parameters, and details", () => {
    const Status = runtime.resolve("dw/system/Status") as unknown as {
      ERROR: number
      new (
        status: number,
        code: string,
        message: string,
        ...parameters: string[]
      ): {
        addDetail(key: string, value: unknown): void
        code: string
        details: { get(key: string): unknown }
        error: boolean
        getCode(): string
        getDetail(key: string): unknown
        getDetails(): unknown
        getItems(): { get(index: number): unknown; length: number }
        getMessage(): string
        getParameters(): { toArray(): string[] }
        getStatus(): number
        isError(): boolean
        message: string
        parameters: { toArray(): string[] }
        status: number
      }
    }
    const status = new Status(Status.ERROR, "FAILED", "Import {0}", "orders.xml")

    expect(status).toMatchObject({
      code: "FAILED",
      error: true,
      message: "Import {0}",
      status: Status.ERROR,
    })
    expect(status.getCode()).toBe("FAILED")
    expect(status.getMessage()).toBe("Import {0}")
    expect(status.getStatus()).toBe(Status.ERROR)
    expect(status.isError()).toBe(true)
    expect(status.parameters.toArray()).toEqual(["orders.xml"])
    expect(status.getParameters()).toBe(status.parameters)
    expect(status.getItems().get(0)).toMatchObject({
      code: "FAILED",
      error: true,
      message: "Import {0}",
      status: Status.ERROR,
    })
    expect(status.getItems().get(0)).not.toBe(status)
    status.addDetail("fileName", "orders.xml")
    expect(status.details.get("fileName")).toBe("orders.xml")
    expect(status.getDetail("fileName")).toBe("orders.xml")
    expect(status.getDetails()).toBe(status.details)
  })

  it("aggregates mutable status items and selects the first error", () => {
    const Status = runtime.resolve("dw/system/Status") as unknown as {
      ERROR: number
      OK: number
      new (): {
        addDetail(key: string, value: unknown): void
        addItem(item: unknown): void
        code: string | null
        error: boolean
        getDetail(key: string): unknown
        getItems(): { length: number }
        message: string | null
        parameters: { toArray(): string[] }
        status: number
      }
      new (
        status: number,
        code: string,
      ): {
        addDetail(key: string, value: unknown): void
        addItem(item: unknown): void
        code: string | null
        error: boolean
        getDetail(key: string): unknown
        getItems(): { length: number }
        message: string | null
        parameters: { toArray(): string[] }
        status: number
      }
    }
    const StatusItem = runtime.resolve("dw/system/StatusItem") as unknown as {
      new (): {
        addDetail(key: string, value: unknown): void
        setCode(code: string): void
        setMessage(message: string): void
        setParameters(...parameters: string[]): void
        setStatus(status: number): void
      }
    }
    const emptyStatus = new Status()
    const status = new Status(Status.OK, "STARTED")
    const error = new StatusItem()

    expect(emptyStatus.getItems().length).toBe(0)
    error.setCode("FAILED")
    error.setMessage("Import {0}")
    error.setParameters("orders.xml")
    error.addDetail("fileName", "orders.xml")
    error.setStatus(Status.ERROR)
    status.addItem(error)

    expect(status).toMatchObject({
      code: "FAILED",
      error: true,
      message: "Import {0}",
      status: Status.ERROR,
    })
    expect(status.parameters.toArray()).toEqual(["orders.xml"])
    expect(status.getDetail("fileName")).toBe("orders.xml")
    expect(status.getItems().length).toBe(2)
    status.addDetail("attempt", 2)
    expect(status.getDetail("attempt")).toBe(2)
  })

  it("provides mutable SFCC array lists", () => {
    interface ArrayList<Item> extends Iterable<Item> {
      add(...values: Item[]): boolean
      addAll(values: ArrayList<Item>): boolean
      clone(): ArrayList<Item>
      iterator(): { hasNext(): boolean; next(): Item }
      push(...values: Item[]): number
      reverse(): void
      sort(comparator?: (left: Item, right: Item) => number): void
      toArray(): Item[]
    }

    const ArrayList = runtime.resolve("dw/util/ArrayList") as unknown as {
      new <Item>(source?: Item[] | ArrayList<Item>): ArrayList<Item>
      new <Item>(...values: Item[]): ArrayList<Item>
      new <Item>(source: { hasNext(): boolean; next(): Item }): ArrayList<Item>
    }
    const list = new ArrayList("beta", "alpha")

    expect(list.add("delta")).toBe(true)
    expect(list.addAll(new ArrayList(["gamma"]))).toBe(true)
    expect(list.push("epsilon")).toBe(5)
    list.sort()
    list.reverse()
    expect(list.toArray()).toEqual(["gamma", "epsilon", "delta", "beta", "alpha"])

    const clone = list.clone()
    clone.add("clone-only")
    expect(list.toArray()).not.toContain("clone-only")

    const iterator = list.iterator()
    expect(iterator.next()).toBe("gamma")
    expect(new ArrayList(iterator).toArray()).toEqual(["epsilon", "delta", "beta", "alpha"])
    expect(iterator.hasNext()).toBe(false)
  })

  it("provides mutable SFCC hash maps with live views", () => {
    interface HashMap<Key, Value> {
      clone(): HashMap<Key, Value>
      containsKey(key: Key): boolean
      entrySet(): { length: number }
      get(key: Key): Value | null
      keySet(): { contains(key: Key): boolean; length: number }
      put(key: Key, value: Value): Value
      putAll(other: HashMap<Key, Value>): void
      remove(key: Key): Value | null
      values(): { contains(value: Value): boolean; length: number }
    }

    const HashMap = runtime.resolve("dw/util/HashMap") as unknown as {
      new <Key, Value>(): HashMap<Key, Value>
    }
    const key = { id: "order" }
    const source = new HashMap<object | string, number>()
    const target = new HashMap<object | string, number>()
    const keys = target.keySet()
    const values = target.values()
    const entries = target.entrySet()

    expect(source.put(key, 1)).toBe(1)
    source.put("retry", 2)
    target.putAll(source)
    expect(target.get(key)).toBe(1)
    expect(keys.contains("retry")).toBe(true)
    expect(values.contains(2)).toBe(true)
    expect(entries.length).toBe(2)
    expect(target.remove("missing")).toBeNull()

    const clone = target.clone()
    clone.put("clone-only", 3)
    expect(target.containsKey("clone-only")).toBe(false)
    expect(clone.remove(key)).toBe(1)
  })

  it("provides SFCC string formatting and UTF-8 Base64 helpers", () => {
    const StringUtils = runtime.resolve("dw/util/StringUtils") as {
      decodeBase64(value: string): string
      encodeBase64(value: string): string
      format(pattern: string, ...values: unknown[]): string
    }

    expect(StringUtils.format("{0}: {1} / {0} / {2}", "Order", 42)).toBe("Order: 42 / Order / {2}")

    const encoded = StringUtils.encodeBase64("Grüße aus Köln")
    expect(encoded).toBe(Buffer.from("Grüße aus Köln", "utf8").toString("base64"))
    expect(StringUtils.decodeBase64(encoded)).toBe("Grüße aus Köln")
  })

  it("provides an SFCC calendar core with UTC field operations", () => {
    interface CalendarInstance {
      add(field: number, value: number): void
      after(other: CalendarInstance): boolean
      before(other: CalendarInstance): boolean
      compareTo(other: CalendarInstance): number
      get(field: number): number
      getTime(): Date
      isSameDay(other: CalendarInstance): boolean
      set(field: number, value: number): void
      setTime(value: Date): void
      time: Date
    }

    const Calendar = runtime.resolve("dw/util/Calendar") as unknown as {
      DATE: number
      HOUR_OF_DAY: number
      MINUTE: number
      MONTH: number
      YEAR: number
      new (date?: Date): CalendarInstance
    }
    const input = new Date("2026-01-31T23:58:59.123Z")
    const calendar = new Calendar(input)

    input.setUTCFullYear(2000)
    expect(calendar.get(Calendar.YEAR)).toBe(2026)
    expect(calendar.get(Calendar.MONTH)).toBe(0)
    expect(calendar.get(Calendar.DATE)).toBe(31)

    calendar.set(Calendar.MINUTE, 5)
    calendar.add(Calendar.HOUR_OF_DAY, 2)
    expect(calendar.getTime().toISOString()).toBe("2026-02-01T01:05:59.123Z")

    const earlier = new Calendar(new Date("2026-02-01T00:00:00.000Z"))
    expect(calendar.after(earlier)).toBe(true)
    expect(earlier.before(calendar)).toBe(true)
    expect(calendar.compareTo(earlier)).toBe(1)
    expect(calendar.isSameDay(earlier)).toBe(true)

    const replacement = new Date("2026-03-04T05:06:07.008Z")
    calendar.time = replacement
    replacement.setUTCFullYear(2000)
    expect(calendar.getTime().toISOString()).toBe("2026-03-04T05:06:07.008Z")
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
    const keys = jobStep.jobExecution.context.keySet()
    const values = jobStep.jobExecution.context.values()
    const entries = jobStep.jobExecution.context.entrySet()
    expect(keys.toArray()).toEqual(["runs", "fileName"])
    expect(keys.toArray(1, 1)).toEqual(["fileName"])
    expect(keys.contains("runs")).toBe(true)
    expect(keys).toMatchObject({ empty: false, length: 2 })
    expect(keys.getLength()).toBe(2)
    expect(keys.isEmpty()).toBe(false)
    expect(keys.size()).toBe(2)
    expect([...keys]).toEqual(["runs", "fileName"])
    const keyIterator = keys.iterator()
    expect(keyIterator.hasNext()).toBe(true)
    expect(keyIterator.next()).toBe("runs")
    const remainingKeys = keyIterator.asList()
    expect(keyIterator.hasNext()).toBe(false)
    expect(remainingKeys.get(0)).toBe("fileName")
    const remainingKeyArray = remainingKeys.toArray()
    remainingKeyArray.push("independent")
    expect(remainingKeys.toArray()).toEqual(["fileName"])
    expect(values.toArray()).toEqual([4, "feed.xml"])
    expect(entries.toArray()).toEqual([
      expect.objectContaining({ key: "runs", value: 4 }),
      expect.objectContaining({ key: "fileName", value: "feed.xml" }),
    ])
    expect(entries.toArray()[0]?.getKey()).toBe("runs")
    expect(entries.toArray()[0]?.getValue()).toBe(4)
    expect(jobStep.jobExecution.context.remove("fileName")).toBe("feed.xml")
    expect(keys.toArray()).toEqual(["runs"])
    expect(values.toArray()).toEqual([4])
    expect(entries.toArray()).toHaveLength(1)
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
