import {
  createModuleResolver,
  resolveCandidateFile,
  resolveCartridgeRoots,
  resolveSuperModuleFilePath,
  resolveSuperModuleSpecifier,
  type ModuleResolutionOptions,
} from "@commerce-klaus/sfcc-module-resolver/resolution"
import {
  createSfccTestRuntime,
  type LoggerEntry,
  type SfccGlobals,
  type SfccModule,
  type SfccTestRuntime,
  type SfccTestRuntimeOptions,
} from "@commerce-klaus/sfcc-test-runtime"
import { parse } from "acorn"
import { simple } from "acorn-walk"
import fs from "node:fs"
import { createRequire, Module } from "node:module"
import path from "node:path"
import { compileFunction } from "node:vm"

const ACTIVE_RUNNER = Symbol.for("@commerce-klaus/sfcc-runner.active")

type RunnerGlobal = typeof globalThis & {
  [ACTIVE_RUNNER]?: object
}

function writeLoggerEntryToConsole(entry: LoggerEntry): void {
  const parameters = [entry.message, ...entry.parameters]
  switch (entry.level) {
    case "debug":
      console.log(...parameters)
      break
    case "info":
      console.info(...parameters)
      break
    case "warn":
      console.warn(...parameters)
      break
    case "error":
    case "fatal":
      console.error(...parameters)
      break
  }
}

export interface SfccRunnerOptions extends ModuleResolutionOptions {
  /** Explicit cartridge order; otherwise use project configuration or resolver inference. */
  cartridgePath?: string[]
  /** Site and process globals exposed by the local SFCC runtime. */
  runtime?: SfccTestRuntimeOptions
}

export interface SfccRunner {
  /** Load an SFCC module. Supply a project-specific export type when available. */
  load<Exports = unknown>(moduleId: string): Exports
  /** Logger calls captured by the default dw/system/Logger implementation. */
  readonly loggerEntries: readonly LoggerEntry[]
  /** Invoke a named function export, or the direct CommonJS function with "default". */
  invoke<Arguments extends unknown[], Result = unknown>(
    moduleId: string,
    exportName: string,
    ...args: Arguments
  ): Result
  /** Replace a module identifier before loading any modules. */
  mock(moduleId: string, implementation: SfccModule): void
  /** Replace one resolved file before loading any modules. */
  mockResolved(filePath: string, implementation: SfccModule): void
  /** Restore process globals and release this runner. Safe to call more than once. */
  close(): void
}

function isCartridgeSpecifier(moduleId: string): boolean {
  return (
    moduleId === "server" ||
    moduleId.startsWith("server/") ||
    moduleId.startsWith("dw/") ||
    moduleId.startsWith("~/") ||
    moduleId.startsWith("*/") ||
    /^[A-Za-z0-9_-]+\/cartridge\//u.test(moduleId)
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

class NodeSfccRunner implements SfccRunner {
  private readonly cache = new Map<string, Module>()
  private readonly runtime: SfccTestRuntime
  private readonly resolveSfccModule: ReturnType<typeof createModuleResolver>
  private readonly token: object
  private closedLoggerEntries: readonly LoggerEntry[] | undefined
  private hasStartedLoading = false
  private isClosed = false

  constructor(
    private readonly options: SfccRunnerOptions,
    private readonly cartridgeRoots: string[],
    runtime: SfccTestRuntime,
    token: object,
  ) {
    this.runtime = runtime
    this.resolveSfccModule = createModuleResolver(cartridgeRoots)
    this.token = token
  }

  get loggerEntries(): readonly LoggerEntry[] {
    return (
      this.closedLoggerEntries ??
      this.runtime.loggerEntries.map((entry) => ({
        ...entry,
        parameters: [...entry.parameters],
      }))
    )
  }

  load<Exports = unknown>(moduleId: string): Exports {
    this.ensureOpen()
    this.hasStartedLoading = true
    return this.requireModule(moduleId) as Exports
  }

  invoke<Arguments extends unknown[], Result = unknown>(
    moduleId: string,
    exportName: string,
    ...args: Arguments
  ): Result {
    const moduleExports = this.load<unknown>(moduleId)
    const candidate =
      exportName === "default" && typeof moduleExports === "function"
        ? moduleExports
        : moduleExports !== null && typeof moduleExports === "object"
          ? Reflect.get(moduleExports, exportName)
          : undefined

    if (typeof candidate !== "function") {
      throw new Error(
        `SFCC runner could not invoke "${exportName}" from "${moduleId}": the export is missing or is not a function.`,
      )
    }

    return Reflect.apply(candidate, moduleExports, args) as Result
  }

  mock(moduleId: string, implementation: SfccModule): void {
    this.ensureCanMock()
    this.runtime.mock(moduleId, implementation)
  }

  mockResolved(filePath: string, implementation: SfccModule): void {
    this.ensureCanMock()
    this.runtime.mockResolved(
      path.resolve(this.options.cwd ?? process.cwd(), filePath),
      implementation,
    )
  }

  close(): void {
    if (this.isClosed) {
      return
    }
    this.closedLoggerEntries = this.loggerEntries
    this.isClosed = true

    const globalNames = Object.keys(this.runtime.getGlobals())
    try {
      this.runtime.reset()
    } finally {
      try {
        this.runtime.unsetGlobals(...globalNames)
      } finally {
        this.cache.clear()
        const currentGlobal = globalThis as RunnerGlobal
        if (currentGlobal[ACTIVE_RUNNER] === this.token) {
          Reflect.deleteProperty(currentGlobal, ACTIVE_RUNNER)
        }
      }
    }
  }

  private requireModule(moduleId: string, importer?: Module): unknown {
    this.ensureOpen()
    const importerPath = importer?.filename
    const filePath = this.resolveFile(moduleId, importerPath)

    if (filePath) {
      return this.runtime.resolve(
        moduleId,
        () => this.loadFile(filePath, importer) as SfccModule,
        filePath,
      )
    }

    if (isCartridgeSpecifier(moduleId)) {
      return this.runtime.resolve(moduleId, () => {
        throw new Error(
          `SFCC runner cannot resolve "${moduleId}"${importerPath ? ` requested by "${importerPath}"` : ""}. Check the cartridge path or register a module mock.`,
        )
      })
    }

    const nativeRequire = createRequire(
      importerPath ?? path.join(this.options.cwd ?? process.cwd(), "package.json"),
    )
    let resolvedDependency: string | undefined
    try {
      resolvedDependency = nativeRequire.resolve(moduleId)
    } catch (error) {
      if (!this.runtime.hasModuleMock(moduleId)) {
        throw new Error(
          `SFCC runner cannot resolve dependency "${moduleId}"${importerPath ? ` requested by "${importerPath}"` : ""}. Register a mock or install the dependency.`,
          { cause: error },
        )
      }
    }

    return this.runtime.resolve(
      moduleId,
      () => {
        try {
          return nativeRequire(moduleId)
        } catch (error) {
          throw new Error(
            `SFCC runner failed to load dependency "${moduleId}"${importerPath ? ` requested by "${importerPath}"` : ""}: ${errorMessage(error)}`,
            { cause: error },
          )
        }
      },
      resolvedDependency,
    )
  }

  private resolveFile(moduleId: string, importerPath?: string): string | undefined {
    if (moduleId.startsWith(".") || path.isAbsolute(moduleId)) {
      const basePath = importerPath
        ? path.dirname(importerPath)
        : (this.options.cwd ?? process.cwd())
      return resolveCandidateFile(path.resolve(basePath, moduleId), moduleId)
    }

    if (!isCartridgeSpecifier(moduleId) || moduleId.startsWith("dw/")) {
      return undefined
    }

    const syntheticImporter =
      importerPath ??
      path.join(
        this.cartridgeRoots[0] ?? this.options.cwd ?? process.cwd(),
        "cartridge",
        "__runner__.js",
      )
    return this.resolveSfccModule(moduleId, syntheticImporter)
  }

  private loadFile(filePath: string, parent?: Module): unknown {
    const cachedModule = this.cache.get(filePath)
    if (cachedModule) {
      return cachedModule.exports
    }

    const module = new Module(filePath, parent)
    module.filename = filePath
    this.cache.set(filePath, module)

    try {
      if (path.extname(filePath) === ".json") {
        try {
          module.exports = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown
        } catch (error) {
          throw new Error(
            `SFCC runner cannot parse JSON module "${filePath}": ${errorMessage(error)}`,
            { cause: error },
          )
        }
        module.loaded = true
        return module.exports
      }

      const source = fs.readFileSync(filePath, "utf8").replace(/^#![^\r\n]*(?:\r?\n|$)/u, "")
      this.rejectDynamicImports(source, filePath)
      module.require = (moduleId: string) => this.requireModule(moduleId, module)
      Object.defineProperty(module, "superModule", {
        configurable: true,
        enumerable: true,
        get: () => {
          const superModulePath = resolveSuperModuleFilePath(filePath, this.cartridgeRoots)
          if (!superModulePath) {
            return undefined
          }

          const superModuleId =
            resolveSuperModuleSpecifier(filePath, this.cartridgeRoots) ?? superModulePath
          return this.runtime.resolve(
            superModuleId,
            () => this.loadFile(superModulePath, module) as SfccModule,
            superModulePath,
          )
        },
      })
      const wrapper = compileFunction(
        source,
        ["exports", "require", "module", "__filename", "__dirname"],
        { filename: filePath },
      )
      Reflect.apply(wrapper, module.exports, [
        module.exports,
        module.require.bind(module),
        module,
        filePath,
        path.dirname(filePath),
      ])
      module.loaded = true
      return module.exports
    } catch (error) {
      this.cache.delete(filePath)
      throw error
    }
  }

  private rejectDynamicImports(source: string, filePath: string): void {
    let program: ReturnType<typeof parse>
    try {
      program = parse(source, {
        allowReturnOutsideFunction: true,
        ecmaVersion: "latest",
        sourceType: "script",
      })
    } catch (error) {
      throw new Error(
        `SFCC runner cannot parse CommonJS cartridge module "${filePath}": ${errorMessage(error)}`,
        { cause: error },
      )
    }

    let hasDynamicImport = false
    simple(program, {
      ImportExpression() {
        hasDynamicImport = true
      },
    })
    if (hasDynamicImport) {
      throw new Error(
        `SFCC runner does not support dynamic import() in CommonJS cartridge module "${filePath}". Use require() instead.`,
      )
    }
  }

  private ensureOpen(): void {
    if (this.isClosed) {
      throw new Error("This SFCC runner is closed.")
    }
  }

  private ensureCanMock(): void {
    this.ensureOpen()
    if (this.hasStartedLoading) {
      throw new Error("Register SFCC runner mocks before loading any modules.")
    }
  }
}

export function createSfccRunner(options: SfccRunnerOptions = {}): SfccRunner {
  if (options.cartridgePath?.length === 0) {
    throw new Error("SFCC runner cartridgePath must not be empty.")
  }

  const cartridgeRoots = resolveCartridgeRoots(options)
  if (cartridgeRoots.length === 0) {
    const configuredPath = options.cartridgePath?.join(":")
    throw new Error(
      configuredPath
        ? `SFCC runner did not find any cartridges in the configured path: ${configuredPath}.`
        : "SFCC runner did not find any cartridges from the runner options or project configuration.",
    )
  }

  const currentGlobal = globalThis as RunnerGlobal
  if (currentGlobal[ACTIVE_RUNNER]) {
    throw new Error(
      "Only one SFCC runner can be open at a time because SFCC globals are process-wide. Close the active runner before creating another.",
    )
  }

  const token = {}
  currentGlobal[ACTIVE_RUNNER] = token
  try {
    const runtime = createSfccTestRuntime({
      ...options.runtime,
      onLoggerEntry:
        options.runtime?.onLoggerEntry === undefined
          ? writeLoggerEntryToConsole
          : options.runtime.onLoggerEntry,
    })
    return new NodeSfccRunner(options, cartridgeRoots, runtime, token)
  } catch (error) {
    if (currentGlobal[ACTIVE_RUNNER] === token) {
      Reflect.deleteProperty(currentGlobal, ACTIVE_RUNNER)
    }
    throw error
  }
}

export type { LoggerEntry, SfccGlobals, SfccModule, SfccTestRuntimeOptions }
