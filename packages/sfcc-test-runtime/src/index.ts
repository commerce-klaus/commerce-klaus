export type SfccModule = object | ((...args: never[]) => unknown)
export type SfccModuleFallback = () => SfccModule

export interface LoggerEntry {
  level: "debug" | "info" | "warn" | "error" | "fatal"
  message: string
  parameters: unknown[]
}

export interface HookCall {
  extensionPoint: string
  functionName: string
  args: unknown[]
}

export type SfccHookImplementation = Record<string, unknown>
export type SfccGlobals = Record<string, unknown>
export type SfccControllerRequest = Record<string, unknown>

export interface SfccControllerResponse {
  cachePeriod: number | null
  contentType: string | null
  headers: Record<string, string>
  isJson: boolean
  messageLog: string[]
  printed: string[]
  redirectStatus: number | null
  redirectUrl: string | null
  statusCode: number | null
  view: string | null
  viewData: Record<string, unknown>
  getViewData(): Record<string, unknown>
  json(data: Record<string, unknown>): void
  log(...items: unknown[]): void
  print(message: string): void
  redirect(url: string): void
  render(name: string, data?: Record<string, unknown>): void
  cacheExpiration(period: number): void
  setContentType(type: string): void
  setHttpHeader(name: string, value: string): void
  setRedirectStatus(status: number): void
  setStatusCode(code: number): void
  setViewData(data: Record<string, unknown>): void
}

export type SfccControllerNext = (error?: Error) => Promise<void>
export type SfccControllerMiddleware = (
  request: SfccControllerRequest,
  response: SfccControllerResponse,
  next: SfccControllerNext,
) => unknown

export interface SfccControllerRoute {
  method: "GET" | "POST"
  name: string
  middleware: SfccControllerMiddleware[]
}

export interface SfccController {
  __routes: Record<string, SfccControllerRoute>
  [routeName: string]: unknown
}

export interface SfccControllerHarness {
  run(routeName: string, request?: SfccControllerRequest): Promise<SfccControllerResponse>
}

export type SfccJobStepModule = Record<string, unknown>
export type SfccJobStepParameters = Record<string, unknown>

export interface SfccJobContext extends Record<string, unknown> {
  readonly empty: boolean
  readonly length: number
  clear(): void
  containsKey(key: string): boolean
  containsValue(value: unknown): boolean
  get(key: string): unknown
  getLength(): number
  isEmpty(): boolean
  put(key: string, value: unknown): unknown
  remove(key: string): unknown
  size(): number
}

export interface SfccJobExecution {
  readonly ID: string
  context: SfccJobContext
  readonly jobID: string
  getContext(): SfccJobContext
  getID(): string
  getJobID(): string
}

export interface SfccJobStepExecution {
  readonly ID: string
  readonly jobExecution: SfccJobExecution
  readonly stepID: string
  readonly stepTypeID: string
  getID(): string
  getJobExecution(): SfccJobExecution
  getStepID(): string
  getStepTypeID(): string
}

export interface SfccChunkItems<Item = unknown> extends Iterable<Item> {
  readonly length: number
  get(index: number): Item
  isEmpty(): boolean
  size(): number
  toArray(): Item[]
}

export interface SfccChunkStepFunctions {
  afterChunk?: string
  afterStep?: string
  beforeChunk?: string
  beforeStep?: string
  getTotalCount?: string
  process?: string
  read?: string
  write?: string
}

export interface SfccChunkStepRunOptions {
  chunkSize: number
  functions?: SfccChunkStepFunctions
  parameters?: SfccJobStepParameters
}

export interface SfccChunkStepResult {
  afterStepResult: unknown
  chunkCount: number
  processedCount: number
  readCount: number
  totalCount: number | null
  writtenCount: number
}

export interface SfccJobStepHarness {
  readonly jobExecution: SfccJobExecution
  readonly stepExecution: SfccJobStepExecution
  run(functionName: string, parameters?: SfccJobStepParameters): Promise<unknown>
  runChunk(options: SfccChunkStepRunOptions): Promise<SfccChunkStepResult>
}

export interface SfccJobStepHarnessOptions {
  context?: Record<string, unknown>
  jobExecutionId?: string
  jobId?: string
  stepExecutionId?: string
  stepId?: string
  stepTypeId?: string
}

export interface SfccTestRuntimeOptions {
  site?: {
    id?: string
    preferences?: Record<string, unknown>
  }
}

class Status {
  static readonly OK = 0
  static readonly ERROR = 1

  readonly status: number
  readonly code: string | null
  readonly message: string | null
  readonly details: unknown

  constructor(status: number, code?: string, message?: string, details?: unknown) {
    this.status = status
    this.code = code ?? null
    this.message = message ?? null
    this.details = details
  }

  isError(): boolean {
    return this.status === Status.ERROR
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

function createChunkItems<Item>(items: Item[]): SfccChunkItems<Item> {
  return {
    length: items.length,
    get: (index) => items[index] as Item,
    isEmpty: () => items.length === 0,
    size: () => items.length,
    toArray: () => [...items],
    [Symbol.iterator]: () => items[Symbol.iterator](),
  }
}

const JOB_CONTEXT = Symbol("sfccJobContext")

function createJobContext(values: Record<string, unknown>): SfccJobContext {
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
    get: { value: (key: string) => (containsKey(key) ? values[key] : null) },
    getLength: { value: () => keys().length },
    isEmpty: { value: () => keys().length === 0 },
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
  })
  return values as SfccJobContext
}

export class SfccTestRuntime {
  readonly hookCalls: HookCall[] = []
  readonly loggerEntries: LoggerEntry[] = []
  readonly transactionCalls: string[] = []

  private readonly options: SfccTestRuntimeOptions
  private readonly defaults = new Map<string, SfccModule>()
  private readonly controllerRoutes = new Map<string, SfccControllerRoute>()
  private readonly hooks = new Map<string, SfccHookImplementation>()
  private readonly mocks = new Map<string, SfccModule>()
  private readonly resolvedMocks = new Map<string, SfccModule>()
  private readonly restoredGlobals = new Map<string, PropertyDescriptor | undefined>()

  constructor(options: SfccTestRuntimeOptions = {}) {
    this.options = options
    this.installDefaults()
    this.installGlobalDefaults()
  }

  mock(moduleId: string, implementation: SfccModule): void {
    this.mocks.set(moduleId, implementation)
  }

  mockResolved(resolvedId: string, implementation: SfccModule): void {
    this.resolvedMocks.set(resolvedId, implementation)
  }

  setGlobals(globals: SfccGlobals): void {
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

  registerHook(extensionPoint: string, implementation: SfccHookImplementation): void {
    if (!this.hooks.has(extensionPoint)) {
      this.hooks.set(extensionPoint, implementation)
    }
  }

  hasHook(extensionPoint: string): boolean {
    return this.hooks.has(extensionPoint)
  }

  callHook(extensionPoint: string, functionName: string, ...args: unknown[]): unknown {
    this.hookCalls.push({ extensionPoint, functionName, args })
    const hookFunction = this.hooks.get(extensionPoint)?.[functionName]
    return typeof hookFunction === "function" ? hookFunction(...args) : undefined
  }

  controller(controller: SfccController): SfccControllerHarness {
    return {
      run: async (routeName, request = {}) => {
        const route = controller.__routes[routeName]
        if (!route) {
          throw new Error(`SFCC controller does not define route ${routeName}.`)
        }

        const response = this.createControllerResponse()
        const dispatch = async (index: number): Promise<void> => {
          if (response.redirectUrl) {
            return
          }
          const middleware = route.middleware[index]
          if (!middleware) {
            return
          }

          let nextCall: Promise<void> | undefined
          await middleware(request, response, (error) => {
            if (nextCall) {
              throw new Error(`SFCC controller route ${routeName} called next() more than once.`)
            }
            if (error) {
              response.log(error)
              nextCall = Promise.reject(error)
            } else {
              nextCall = dispatch(index + 1)
            }
            return nextCall
          })
          await nextCall
        }

        await dispatch(0)
        return response
      },
    }
  }

  jobStep(
    jobStepModule: SfccJobStepModule,
    options: SfccJobStepHarnessOptions = {},
  ): SfccJobStepHarness {
    const context = createJobContext(options.context ?? {})
    const jobExecutionId = options.jobExecutionId ?? "TestJobExecution"
    const jobId = options.jobId ?? "TestJob"
    const jobExecution: SfccJobExecution = {
      ID: jobExecutionId,
      context,
      getContext: () => context,
      getID: () => jobExecutionId,
      getJobID: () => jobId,
      jobID: jobId,
    }
    const stepExecutionId = options.stepExecutionId ?? "TestStepExecution"
    const stepId = options.stepId ?? "TestStep"
    const stepTypeId = options.stepTypeId ?? "custom.TestStep"
    const stepExecution: SfccJobStepExecution = {
      ID: stepExecutionId,
      getID: () => stepExecutionId,
      getJobExecution: () => jobExecution,
      getStepID: () => stepId,
      getStepTypeID: () => stepTypeId,
      jobExecution,
      stepID: stepId,
      stepTypeID: stepTypeId,
    }
    const requireFunction = (functionName: string): ((...args: unknown[]) => unknown) => {
      const stepFunction = jobStepModule[functionName]
      if (typeof stepFunction !== "function") {
        throw new Error(`SFCC job step does not export function ${functionName}.`)
      }
      return stepFunction as (...args: unknown[]) => unknown
    }
    const optionalFunction = (
      functionName: string,
      configured: boolean,
    ): ((...args: unknown[]) => unknown) | undefined => {
      const stepFunction = jobStepModule[functionName]
      if (stepFunction === undefined) {
        if (configured) {
          throw new Error(`SFCC job step does not export function ${functionName}.`)
        }
        return undefined
      }
      return requireFunction(functionName)
    }

    return {
      jobExecution,
      stepExecution,
      run: async (functionName, parameters = {}) => {
        return requireFunction(functionName)(parameters, stepExecution)
      },
      runChunk: async ({ chunkSize, functions = {}, parameters = {} }) => {
        if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
          throw new Error("SFCC chunk job step requires a positive integer chunk size.")
        }

        const names = {
          afterChunk: functions.afterChunk ?? "afterChunk",
          afterStep: functions.afterStep ?? "afterStep",
          beforeChunk: functions.beforeChunk ?? "beforeChunk",
          beforeStep: functions.beforeStep ?? "beforeStep",
          getTotalCount: functions.getTotalCount ?? "getTotalCount",
          process: functions.process ?? "process",
          read: functions.read ?? "read",
          write: functions.write ?? "write",
        }
        const afterChunk = optionalFunction(names.afterChunk, functions.afterChunk !== undefined)
        const afterStep = optionalFunction(names.afterStep, functions.afterStep !== undefined)
        const beforeChunk = optionalFunction(names.beforeChunk, functions.beforeChunk !== undefined)
        const beforeStep = optionalFunction(names.beforeStep, functions.beforeStep !== undefined)
        const getTotalCount = optionalFunction(
          names.getTotalCount,
          functions.getTotalCount !== undefined,
        )
        const process = optionalFunction(names.process, functions.process !== undefined)
        const read = requireFunction(names.read)
        const write = requireFunction(names.write)
        const result: SfccChunkStepResult = {
          afterStepResult: undefined,
          chunkCount: 0,
          processedCount: 0,
          readCount: 0,
          totalCount: null,
          writtenCount: 0,
        }
        let successful = false

        try {
          await beforeStep?.(parameters, stepExecution)
          if (getTotalCount) {
            const totalCount = await getTotalCount(parameters, stepExecution)
            if (typeof totalCount !== "number" || !Number.isFinite(totalCount) || totalCount < 0) {
              throw new Error(
                "SFCC chunk job step getTotalCount() must return a non-negative number.",
              )
            }
            result.totalCount = totalCount
          }

          let complete = false
          while (!complete) {
            await beforeChunk?.(parameters, stepExecution)
            const processedItems: unknown[] = []
            let chunkReadCount = 0

            while (chunkReadCount < chunkSize) {
              const item = await read(parameters, stepExecution)
              if (item == null) {
                complete = true
                break
              }
              chunkReadCount += 1
              result.readCount += 1
              const processedItem = process ? await process(item, parameters, stepExecution) : item
              if (processedItem != null) {
                processedItems.push(processedItem)
                result.processedCount += 1
              }
            }

            if (chunkReadCount === 0) {
              break
            }
            if (processedItems.length > 0) {
              await write(createChunkItems(processedItems), parameters, stepExecution)
              result.writtenCount += processedItems.length
            }
            await afterChunk?.(parameters, stepExecution)
            result.chunkCount += 1
          }
          successful = true
        } finally {
          result.afterStepResult = await afterStep?.(successful, parameters, stepExecution)
        }

        return result
      },
    }
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
    for (const [name, descriptor] of this.restoredGlobals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
      } else {
        Reflect.deleteProperty(globalThis, name)
      }
    }
    this.restoredGlobals.clear()
    this.controllerRoutes.clear()
    this.hooks.clear()
    this.hookCalls.length = 0
    this.mocks.clear()
    this.resolvedMocks.clear()
    this.loggerEntries.length = 0
    this.transactionCalls.length = 0
    this.installGlobalDefaults()
  }

  private installGlobalDefaults(): void {
    this.setGlobals({ empty })
  }

  private createControllerResponse(): SfccControllerResponse {
    return {
      cachePeriod: null,
      contentType: null,
      headers: {},
      isJson: false,
      messageLog: [],
      printed: [],
      redirectStatus: null,
      redirectUrl: null,
      statusCode: null,
      view: null,
      viewData: {},
      getViewData() {
        return this.viewData
      },
      json(data) {
        this.isJson = true
        Object.assign(this.viewData, data)
      },
      log(...items) {
        this.messageLog.push(
          items
            .map((item) => {
              if (typeof item === "object") {
                return JSON.stringify(item)
              }
              if (typeof item === "function") {
                return item.name ? `[Function: ${item.name}]` : "[Function]"
              }
              if (typeof item === "symbol") {
                return item.description ? `Symbol(${item.description})` : "Symbol()"
              }
              if (typeof item === "undefined") {
                return "undefined"
              }
              if (typeof item === "boolean") {
                return item ? "true" : "false"
              }
              if (typeof item === "string") {
                return item
              }
              if (typeof item === "bigint") {
                return BigInt.prototype.toString.call(item)
              }
              return Number.prototype.toString.call(item)
            })
            .join(" "),
        )
      },
      print(message) {
        this.printed.push(message)
      },
      redirect(url) {
        this.redirectUrl = url
      },
      render(name, data) {
        this.view = name
        Object.assign(this.viewData, data)
      },
      cacheExpiration(period) {
        this.cachePeriod = period
      },
      setContentType(type) {
        this.contentType = type
      },
      setHttpHeader(name, value) {
        this.headers[name] = value
      },
      setRedirectStatus(status) {
        this.redirectStatus = status
      },
      setStatusCode(code) {
        this.statusCode = code
      },
      setViewData(data) {
        Object.assign(this.viewData, data)
      },
    }
  }

  private createServerModule(): SfccModule {
    const validateMiddleware = (name: string, middleware: SfccControllerMiddleware[]): void => {
      if (typeof name !== "string" || middleware.some((item) => typeof item !== "function")) {
        throw new Error("SFCC server routes require a name followed by middleware functions.")
      }
    }
    const requireRoute = (name: string): SfccControllerRoute => {
      const route = this.controllerRoutes.get(name)
      if (!route) {
        throw new Error(`SFCC server route ${name} does not exist.`)
      }
      return route
    }
    const register = (
      method: SfccControllerRoute["method"],
      name: string,
      middleware: SfccControllerMiddleware[],
    ): SfccControllerRoute => {
      validateMiddleware(name, middleware)
      if (this.controllerRoutes.has(name)) {
        throw new Error(`SFCC server route ${name} is already registered.`)
      }

      const route = { method, name, middleware }
      this.controllerRoutes.set(name, route)
      return route
    }

    return {
      append: (name: string, ...middleware: SfccControllerMiddleware[]) => {
        validateMiddleware(name, middleware)
        requireRoute(name).middleware.push(...middleware)
      },
      extend: (controller: SfccController) => {
        const routes = Object.values(controller.__routes ?? {})
        if (routes.length === 0) {
          throw new Error("SFCC server can only extend a controller with routes.")
        }
        this.controllerRoutes.clear()
        for (const route of routes) {
          this.controllerRoutes.set(route.name, {
            ...route,
            middleware: [...route.middleware],
          })
        }
      },
      exports: (): SfccController => {
        const routes = Object.fromEntries(this.controllerRoutes)
        return { ...routes, __routes: routes }
      },
      get: (name: string, ...middleware: SfccControllerMiddleware[]) =>
        register("GET", name, middleware),
      getRoute: (name: string) => this.controllerRoutes.get(name),
      post: (name: string, ...middleware: SfccControllerMiddleware[]) =>
        register("POST", name, middleware),
      prepend: (name: string, ...middleware: SfccControllerMiddleware[]) => {
        validateMiddleware(name, middleware)
        requireRoute(name).middleware.unshift(...middleware)
      },
      replace: (name: string, ...middleware: SfccControllerMiddleware[]) => {
        validateMiddleware(name, middleware)
        const route = requireRoute(name)
        this.controllerRoutes.set(name, { ...route, middleware })
      },
    }
  }

  private installDefaults(): void {
    this.defaults.set("server", this.createServerModule())
    this.defaults.set("dw/system/HookMgr", {
      callHook: (extensionPoint: string, functionName: string, ...args: unknown[]) =>
        this.callHook(extensionPoint, functionName, ...args),
      hasHook: (extensionPoint: string) => this.hasHook(extensionPoint),
    })
    this.defaults.set("dw/system/Status", Status)
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
