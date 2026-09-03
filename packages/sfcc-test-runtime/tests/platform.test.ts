import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createSfccTestRuntime, setSfccTestRuntime } from "../src/index.js"

describe("SFCC platform mocks", () => {
  const runtime = createSfccTestRuntime()

  beforeEach(() => {
    runtime.reset()
    setSfccTestRuntime(runtime)
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
})
