export type SfccGlobals = Record<string, unknown>

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
  private readonly restoredGlobals = new Map<string, PropertyDescriptor | undefined>()

  installDefaults(): void {
    this.set({ empty })
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
}
