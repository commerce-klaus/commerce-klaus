import {
  ControllerRuntime,
  type SfccController,
  type SfccControllerHarness,
} from "./harness/controller.js"
import {
  createJobStepHarness,
  type SfccJobStepHarness,
  type SfccJobStepHarnessOptions,
  type SfccJobStepModule,
} from "./harness/job-step.js"
import { GlobalsRuntime, type SfccGlobals } from "./runtime/globals.js"
import { HooksRuntime, type SfccHookImplementation } from "./runtime/hooks.js"
import {
  ModuleRegistry,
  type SfccModule,
  type SfccModuleFallback,
  type SfccTestRuntimeOptions,
} from "./runtime/modules.js"

export type { SfccCalendar } from "./platform/calendar.js"
export type {
  SfccController,
  SfccControllerHarness,
  SfccControllerMiddleware,
  SfccControllerNext,
  SfccControllerRequest,
  SfccControllerResponse,
  SfccControllerRoute,
} from "./harness/controller.js"
export type {
  SfccChunkItems,
  SfccChunkStepFunctions,
  SfccChunkStepResult,
  SfccChunkStepRunOptions,
  SfccJobExecution,
  SfccJobStepExecution,
  SfccJobStepHarness,
  SfccJobStepHarnessOptions,
  SfccJobStepModule,
  SfccJobStepParameters,
} from "./harness/job-step.js"
export type {
  SfccArrayList,
  SfccCollection,
  SfccHashMap,
  SfccIterator,
  SfccJobContext,
  SfccList,
  SfccMapEntry,
} from "./platform/collections.js"
export type { SfccStatus, SfccStatusItem } from "./platform/status.js"
export type { SfccStringUtils } from "./platform/string-utils.js"
export type { SfccGlobals } from "./runtime/globals.js"
export type { HookCall, SfccHookImplementation } from "./runtime/hooks.js"
export type {
  LoggerEntry,
  SfccModule,
  SfccModuleFallback,
  SfccTestRuntimeOptions,
} from "./runtime/modules.js"

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

const ACTIVE_RUNTIME = Symbol.for("@commerce-klaus/sfcc-test-runtime.active")

type RuntimeGlobal = typeof globalThis & {
  [ACTIVE_RUNTIME]?: SfccTestRuntime
}

function runtimeGlobal(): RuntimeGlobal {
  return globalThis as RuntimeGlobal
}

export function createSfccTestRuntime(options?: SfccTestRuntimeOptions): SfccTestRuntime {
  return new SfccTestRuntime(options)
}

export function getSfccTestRuntime(): SfccTestRuntime {
  const currentGlobal = runtimeGlobal()
  currentGlobal[ACTIVE_RUNTIME] ??= new SfccTestRuntime()
  return currentGlobal[ACTIVE_RUNTIME]
}

export function setSfccTestRuntime(runtime: SfccTestRuntime): void {
  runtimeGlobal()[ACTIVE_RUNTIME] = runtime
}

export function requireSfccModule(
  moduleId: string,
  fallback?: SfccModuleFallback,
  resolvedId?: string,
): SfccModule {
  return getSfccTestRuntime().resolve(moduleId, fallback, resolvedId)
}
