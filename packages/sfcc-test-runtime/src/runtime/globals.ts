export interface SfccCustomerGlobal {
  authenticated?: boolean
  profile?: unknown
  registered?: boolean
  [name: string]: unknown
}

export interface SfccRequestGlobal {
  custom?: Record<string, unknown>
  httpHeaders?: unknown
  httpParameterMap?: unknown
  locale?: string
  querystring?: Record<string, unknown>
  [name: string]: unknown
}

export interface SfccResponseGlobal {
  setExpires?(value: number): void
  setHttpHeader?(name: string, value: string): void
  [name: string]: unknown
}

export interface SfccSessionGlobal {
  custom?: Record<string, unknown>
  privacy?: Record<string, unknown>
  [name: string]: unknown
}

export interface SfccKnownGlobals {
  customer: SfccCustomerGlobal
  empty(value: unknown): boolean
  request: SfccRequestGlobal
  response: SfccResponseGlobal
  session: SfccSessionGlobal
}

export interface SfccGlobals extends Partial<SfccKnownGlobals> {
  [name: string]: unknown
}

function empty(value: unknown): boolean {
  if (value == null) {
    return true
  }
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === "object" && "isEmpty" in value && typeof value.isEmpty === "function") {
    return Boolean(value.isEmpty())
  }
  return false
}

export class GlobalsRuntime {
  private readonly defaultGlobals: SfccGlobals
  private readonly restoredGlobals = new Map<string, PropertyDescriptor | undefined>()

  constructor(defaultGlobals: SfccGlobals = {}) {
    this.defaultGlobals = { ...defaultGlobals }
  }

  installDefaults(): void {
    this.set({ empty, ...this.defaultGlobals })
  }

  reset(): void {
    for (const [name, descriptor] of this.restoredGlobals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
      } else {
        Reflect.deleteProperty(globalThis, name)
      }
    }
    this.restoredGlobals.clear()
    this.installDefaults()
  }

  set(globals: SfccGlobals): void {
    const entries = Object.entries(globals)
    for (const [name] of entries) {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
      if (!this.restoredGlobals.has(name) && descriptor && !descriptor.configurable) {
        throw new Error(`SFCC test runtime cannot override non-configurable global ${name}.`)
      }
    }

    for (const [name, value] of entries) {
      if (!this.restoredGlobals.has(name)) {
        this.restoredGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
      }
      Object.defineProperty(globalThis, name, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
      })
    }
  }

  get<Name extends keyof SfccKnownGlobals>(name: Name): SfccKnownGlobals[Name] | undefined
  get<Value = unknown>(name: string): Value | undefined
  get<Value = unknown>(name: string): Value | undefined {
    return this.restoredGlobals.has(name) ? (Reflect.get(globalThis, name) as Value) : undefined
  }

  getAll(): Readonly<SfccGlobals> {
    return Object.fromEntries(
      [...this.restoredGlobals.keys()].map((name) => [name, Reflect.get(globalThis, name)]),
    )
  }

  has(name: string): boolean {
    return this.restoredGlobals.has(name)
  }

  unset(names: readonly string[]): void {
    for (const name of names) {
      if (!this.restoredGlobals.has(name)) {
        continue
      }

      const descriptor = this.restoredGlobals.get(name)
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
      } else {
        Reflect.deleteProperty(globalThis, name)
      }
      this.restoredGlobals.delete(name)
    }
  }
}
