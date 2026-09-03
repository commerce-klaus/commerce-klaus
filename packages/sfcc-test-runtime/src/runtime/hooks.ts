export interface HookCall {
  extensionPoint: string
  functionName: string
  args: unknown[]
}

export type SfccHookImplementation = Record<string, unknown>

export class HooksRuntime {
  readonly calls: HookCall[] = []

  private readonly hooks = new Map<string, SfccHookImplementation>()

  call(extensionPoint: string, functionName: string, ...args: unknown[]): unknown {
    this.calls.push({ extensionPoint, functionName, args })
    const hookFunction = this.hooks.get(extensionPoint)?.[functionName]
    return typeof hookFunction === "function" ? hookFunction(...args) : undefined
  }

  createModule(): object {
    return {
      callHook: (extensionPoint: string, functionName: string, ...args: unknown[]) =>
        this.call(extensionPoint, functionName, ...args),
      hasHook: (extensionPoint: string) => this.has(extensionPoint),
    }
  }

  has(extensionPoint: string): boolean {
    return this.hooks.has(extensionPoint)
  }

  register(extensionPoint: string, implementation: SfccHookImplementation): void {
    if (!this.hooks.has(extensionPoint)) {
      this.hooks.set(extensionPoint, implementation)
    }
  }

  reset(): void {
    this.hooks.clear()
    this.calls.length = 0
  }
}
