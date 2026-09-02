import {
  ControllerRuntime,
  type SfccController,
  type SfccControllerHarness,
} from "../harness/controller.js"
import {
  createJobStepHarness,
  type SfccJobStepHarness,
  type SfccJobStepHarnessOptions,
  type SfccJobStepModule,
} from "../harness/job-step.js"
import { GlobalsRuntime, type SfccGlobals } from "./globals.js"
import { HooksRuntime, type SfccHookImplementation } from "./hooks.js"
import {
  ModuleRegistry,
  type SfccModule,
  type SfccModuleFallback,
  type SfccTestRuntimeOptions,
} from "./modules.js"

export class SfccTestRuntime {
  readonly hookCalls: HooksRuntime["calls"]
  readonly loggerEntries: ModuleRegistry["loggerEntries"]
  readonly transactionCalls: ModuleRegistry["transactionCalls"]

  private readonly controllerRuntime = new ControllerRuntime()
  private readonly globalsRuntime = new GlobalsRuntime()
  private readonly hooksRuntime = new HooksRuntime()
  private readonly moduleRegistry: ModuleRegistry

  constructor(options: SfccTestRuntimeOptions = {}) {
    this.moduleRegistry = new ModuleRegistry({
      ...options,
      hookModule: this.hooksRuntime.createModule(),
      serverModule: this.controllerRuntime.createServerModule(),
    })
    this.hookCalls = this.hooksRuntime.calls
    this.loggerEntries = this.moduleRegistry.loggerEntries
    this.transactionCalls = this.moduleRegistry.transactionCalls
    this.globalsRuntime.installDefaults()
  }

  mock(moduleId: string, implementation: SfccModule): void {
    this.moduleRegistry.mock(moduleId, implementation)
  }

  mockResolved(resolvedId: string, implementation: SfccModule): void {
    this.moduleRegistry.mockResolved(resolvedId, implementation)
  }

  setGlobals(globals: SfccGlobals): void {
    this.globalsRuntime.set(globals)
  }

  registerHook(extensionPoint: string, implementation: SfccHookImplementation): void {
    this.hooksRuntime.register(extensionPoint, implementation)
  }

  hasHook(extensionPoint: string): boolean {
    return this.hooksRuntime.has(extensionPoint)
  }

  callHook(extensionPoint: string, functionName: string, ...args: unknown[]): unknown {
    return this.hooksRuntime.call(extensionPoint, functionName, ...args)
  }

  controller(controller: SfccController): SfccControllerHarness {
    return this.controllerRuntime.controller(controller)
  }

  jobStep(
    jobStepModule: SfccJobStepModule,
    options: SfccJobStepHarnessOptions = {},
  ): SfccJobStepHarness {
    return createJobStepHarness(jobStepModule, options)
  }

  resolve(moduleId: string, fallback?: SfccModuleFallback, resolvedId?: string): SfccModule {
    return this.moduleRegistry.resolve(moduleId, fallback, resolvedId)
  }

  reset(): void {
    this.controllerRuntime.reset()
    this.globalsRuntime.reset()
    this.hooksRuntime.reset()
    this.moduleRegistry.reset()
  }
}
