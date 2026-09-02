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
import { Calendar } from "./platform/calendar.js"
import { ArrayList, HashMap } from "./platform/collections.js"
import { Status, StatusItem } from "./platform/status.js"
import { createStringUtilsModule } from "./platform/string-utils.js"
import { GlobalsRuntime, type SfccGlobals } from "./runtime/globals.js"
import { HooksRuntime, type SfccHookImplementation } from "./runtime/hooks.js"

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

export type SfccModule = object | ((...args: never[]) => unknown)
export type SfccModuleFallback = () => SfccModule

export interface LoggerEntry {
  level: "debug" | "info" | "warn" | "error" | "fatal"
  message: string
  parameters: unknown[]
}

export interface SfccTestRuntimeOptions {
  site?: {
    id?: string
    preferences?: Record<string, unknown>
  }
}

function createLoggerModule(entries: LoggerEntry[]): SfccModule {
  const write =
    (level: LoggerEntry["level"]) =>
    (message: string, ...parameters: unknown[]) => {
      entries.push({ level, message, parameters })
    }

  return {
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    fatal: write("fatal"),
    getLogger: () => createLoggerModule(entries),
  }
}

export class SfccTestRuntime {
  readonly hookCalls: HooksRuntime["calls"]
  readonly loggerEntries: LoggerEntry[] = []
  readonly transactionCalls: string[] = []

  private readonly options: SfccTestRuntimeOptions
  private readonly controllerRuntime = new ControllerRuntime()
  private readonly defaults = new Map<string, SfccModule>()
  private readonly globalsRuntime = new GlobalsRuntime()
  private readonly hooksRuntime = new HooksRuntime()
  private readonly mocks = new Map<string, SfccModule>()
  private readonly resolvedMocks = new Map<string, SfccModule>()

  constructor(options: SfccTestRuntimeOptions = {}) {
    this.options = options
    this.hookCalls = this.hooksRuntime.calls
    this.installDefaults()
    this.globalsRuntime.installDefaults()
  }

  mock(moduleId: string, implementation: SfccModule): void {
    this.mocks.set(moduleId, implementation)
  }

  mockResolved(resolvedId: string, implementation: SfccModule): void {
    this.resolvedMocks.set(resolvedId, implementation)
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
    const implementation =
      (resolvedId ? this.resolvedMocks.get(resolvedId) : undefined) ??
      this.mocks.get(moduleId) ??
      this.defaults.get(moduleId)
    if (implementation) {
      return implementation
    }
    if (fallback) {
      return fallback()
    }
    throw new Error(
      `SFCC test runtime does not implement ${moduleId}. Register it with runtime.mock().`,
    )
  }

  reset(): void {
    this.controllerRuntime.reset()
    this.globalsRuntime.reset()
    this.hooksRuntime.reset()
    this.mocks.clear()
    this.resolvedMocks.clear()
    this.loggerEntries.length = 0
    this.transactionCalls.length = 0
  }

  private installDefaults(): void {
    this.defaults.set("server", this.controllerRuntime.createServerModule())
    this.defaults.set("dw/system/HookMgr", this.hooksRuntime.createModule())
    this.defaults.set("dw/system/Status", Status)
    this.defaults.set("dw/system/StatusItem", StatusItem)
    this.defaults.set("dw/util/ArrayList", ArrayList)
    this.defaults.set("dw/util/Calendar", Calendar)
    this.defaults.set("dw/util/HashMap", HashMap)
    this.defaults.set("dw/util/StringUtils", createStringUtilsModule())
    this.defaults.set("dw/system/Logger", createLoggerModule(this.loggerEntries))
    this.defaults.set("dw/system/Transaction", {
      begin: () => this.transactionCalls.push("begin"),
      commit: () => this.transactionCalls.push("commit"),
      rollback: () => this.transactionCalls.push("rollback"),
      wrap: <Result>(callback: () => Result): Result => {
        this.transactionCalls.push("wrap")
        return callback()
      },
    })

    const site = {
      ID: this.options.site?.id ?? "TestSite",
      getCustomPreferenceValue: (name: string) => this.options.site?.preferences?.[name] ?? null,
    }
    this.defaults.set("dw/system/Site", { getCurrent: () => site })
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
