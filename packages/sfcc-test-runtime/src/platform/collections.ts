export interface SfccCollection<Item> extends Iterable<Item> {
  readonly empty: boolean
  readonly length: number
  contains(value: Item): boolean
  getLength(): number
  isEmpty(): boolean
  iterator(): SfccIterator<Item>
  size(): number
  toArray(): Item[]
  toArray(start: number, size: number): Item[]
}

export interface SfccIterator<Item> {
  asList(): SfccList<Item>
  hasNext(): boolean
  next(): Item
}

export interface SfccList<Item> extends SfccCollection<Item> {
  get(index: number): Item
}

export interface SfccArrayList<Item> extends SfccList<Item> {
  add(...values: Item[]): boolean
  addAll(values: SfccCollection<Item>): boolean
  clone(): SfccArrayList<Item>
  push(...values: Item[]): number
  reverse(): void
  sort(comparator?: (left: Item, right: Item) => number): void
}

export interface SfccMapEntry<Key, Value> {
  readonly key: Key
  readonly value: Value
  getKey(): Key
  getValue(): Value
}

export interface SfccHashMap<Key, Value> {
  readonly empty: boolean
  readonly length: number
  clear(): void
  clone(): SfccHashMap<Key, Value>
  containsKey(key: Key): boolean
  containsValue(value: Value): boolean
  entrySet(): SfccCollection<SfccMapEntry<Key, Value>>
  get(key: Key): Value | null
  getLength(): number
  isEmpty(): boolean
  keySet(): SfccCollection<Key>
  put(key: Key, value: Value): Value
  putAll(other: SfccHashMap<Key, Value>): void
  remove(key: Key): Value | null
  size(): number
  values(): SfccCollection<Value>
}

export interface SfccJobContext extends Record<string, unknown> {
  readonly empty: boolean
  readonly length: number
  clear(): void
  containsKey(key: string): boolean
  containsValue(value: unknown): boolean
  entrySet(): SfccCollection<SfccMapEntry<string, unknown>>
  get(key: string): unknown
  getLength(): number
  isEmpty(): boolean
  keySet(): SfccCollection<string>
  put(key: string, value: unknown): unknown
  remove(key: string): unknown
  size(): number
  values(): SfccCollection<unknown>
}

export function createCollection<Item>(getItems: () => Item[]): SfccCollection<Item> {
  return {
    get empty() {
      return getItems().length === 0
    },
    get length() {
      return getItems().length
    },
    contains: (value) => getItems().includes(value),
    getLength: () => getItems().length,
    isEmpty: () => getItems().length === 0,
    iterator: () => {
      const items = getItems()
      let index = 0
      return {
        asList: () => {
          const remainingItems = items.slice(index)
          index = items.length
          return createList(remainingItems)
        },
        hasNext: () => index < items.length,
        next: () => items[index++] as Item,
      }
    },
    size: () => getItems().length,
    toArray: (start?: number, size?: number) => {
      const items = getItems()
      if (start === undefined || size === undefined) {
        return [...items]
      }
      return items.slice(Math.max(0, start), Math.max(0, start) + Math.max(0, size))
    },
    [Symbol.iterator]: () => getItems()[Symbol.iterator](),
  }
}

export function createList<Item>(items: Item[]): SfccList<Item> {
  return Object.assign(
    createCollection(() => items),
    {
      get: (index: number) => items[index] as Item,
    },
  )
}

export class ArrayList<Item> implements SfccArrayList<Item> {
  private readonly values: Item[]

  constructor()
  constructor(source: SfccCollection<Item> | SfccIterator<Item> | readonly Item[])
  constructor(...values: Item[])
  constructor(
    ...valuesOrSource: Item[] | [SfccCollection<Item> | SfccIterator<Item> | readonly Item[]]
  ) {
    if (valuesOrSource.length !== 1) {
      this.values = [...(valuesOrSource as Item[])]
      return
    }

    const [source] = valuesOrSource
    if (Array.isArray(source)) {
      this.values = [...source] as Item[]
      return
    }
    if (
      typeof source === "object" &&
      source !== null &&
      "hasNext" in source &&
      typeof source.hasNext === "function"
    ) {
      this.values = []
      const iterator = source as SfccIterator<Item>
      while (iterator.hasNext()) {
        this.values.push(iterator.next())
      }
      return
    }
    if (typeof source === "object" && source !== null && Symbol.iterator in source) {
      this.values = [...(source as SfccCollection<Item>)]
      return
    }
    this.values = [source as Item]
  }

  get empty(): boolean {
    return this.values.length === 0
  }

  get length(): number {
    return this.values.length
  }

  add(...values: Item[]): boolean {
    this.values.push(...values)
    return values.length > 0
  }

  addAll(values: SfccCollection<Item>): boolean {
    return this.add(...values)
  }

  clone(): SfccArrayList<Item> {
    return new ArrayList(this.values)
  }

  contains(value: Item): boolean {
    return this.values.includes(value)
  }

  get(index: number): Item {
    return this.values[index] as Item
  }

  getLength(): number {
    return this.values.length
  }

  isEmpty(): boolean {
    return this.values.length === 0
  }

  iterator(): SfccIterator<Item> {
    return createList(this.values).iterator()
  }

  push(...values: Item[]): number {
    return this.values.push(...values)
  }

  reverse(): void {
    this.values.reverse()
  }

  size(): number {
    return this.values.length
  }

  sort(comparator?: (left: Item, right: Item) => number): void {
    this.values.sort(comparator)
  }

  toArray(): Item[]
  toArray(start: number, size: number): Item[]
  toArray(start?: number, size?: number): Item[] {
    if (start === undefined || size === undefined) {
      return [...this.values]
    }
    return this.values.slice(Math.max(0, start), Math.max(0, start) + Math.max(0, size))
  }

  [Symbol.iterator](): ArrayIterator<Item> {
    return this.values[Symbol.iterator]()
  }
}

export class HashMap<Key, Value> implements SfccHashMap<Key, Value> {
  private readonly entries = new Map<Key, Value>()

  get empty(): boolean {
    return this.entries.size === 0
  }

  get length(): number {
    return this.entries.size
  }

  clear(): void {
    this.entries.clear()
  }

  clone(): SfccHashMap<Key, Value> {
    const clone = new HashMap<Key, Value>()
    clone.putAll(this)
    return clone
  }

  containsKey(key: Key): boolean {
    return this.entries.has(key)
  }

  containsValue(value: Value): boolean {
    return [...this.entries.values()].includes(value)
  }

  entrySet(): SfccCollection<SfccMapEntry<Key, Value>> {
    return createCollection(() =>
      [...this.entries].map(([key, value]) => createMapEntry(key, value)),
    )
  }

  get(key: Key): Value | null {
    return this.entries.get(key) ?? null
  }

  getLength(): number {
    return this.entries.size
  }

  isEmpty(): boolean {
    return this.entries.size === 0
  }

  keySet(): SfccCollection<Key> {
    return createCollection(() => [...this.entries.keys()])
  }

  put(key: Key, value: Value): Value {
    this.entries.set(key, value)
    return value
  }

  putAll(other: SfccHashMap<Key, Value>): void {
    for (const entry of other.entrySet()) {
      this.put(entry.getKey(), entry.getValue())
    }
  }

  remove(key: Key): Value | null {
    const value = this.get(key)
    this.entries.delete(key)
    return value
  }

  size(): number {
    return this.entries.size
  }

  values(): SfccCollection<Value> {
    return createCollection(() => [...this.entries.values()])
  }
}

function createMapEntry<Key, Value>(key: Key, value: Value): SfccMapEntry<Key, Value> {
  return {
    getKey: () => key,
    getValue: () => value,
    key,
    value,
  }
}

const JOB_CONTEXT = Symbol("sfccJobContext")

export function createJobContext(values: Record<string, unknown>): SfccJobContext {
  if (JOB_CONTEXT in values) {
    return values as unknown as SfccJobContext
  }
  const keys = () => Object.keys(values)
  const containsKey = (key: string) => Object.prototype.propertyIsEnumerable.call(values, key)
  Object.defineProperties(values, {
    [JOB_CONTEXT]: { value: true },
    clear: { value: () => keys().forEach((key) => Reflect.deleteProperty(values, key)) },
    containsKey: { value: containsKey },
    containsValue: { value: (value: unknown) => Object.values(values).includes(value) },
    empty: { get: () => keys().length === 0 },
    entrySet: {
      value: () => createCollection(() => keys().map((key) => createMapEntry(key, values[key]))),
    },
    get: { value: (key: string) => (containsKey(key) ? values[key] : null) },
    getLength: { value: () => keys().length },
    isEmpty: { value: () => keys().length === 0 },
    keySet: { value: () => createCollection(keys) },
    length: { get: () => keys().length },
    put: {
      value: (key: string, value: unknown) => {
        values[key] = value
        return value
      },
    },
    remove: {
      value: (key: string) => {
        const previousValue = containsKey(key) ? values[key] : null
        Reflect.deleteProperty(values, key)
        return previousValue
      },
    },
    size: { value: () => keys().length },
    values: { value: () => createCollection(() => Object.values(values)) },
  })
  return values as SfccJobContext
}
