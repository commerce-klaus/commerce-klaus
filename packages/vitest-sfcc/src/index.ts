import {
  createSfccModuleResolver,
  findResolvedHookRegistrations,
  findResolvedStepTypeDefinitions,
  resolveCandidateFile,
  resolveCartridgeRoots,
  resolveSuperModuleFilePath,
  type ResolvedStepTypeDefinition,
  type StepTypeExecutionMetadata,
  type StepTypeParameterDefinition,
} from "@commerce-klaus/sfcc-module-resolver"
import {
  createSfccTestRuntime,
  getSfccTestRuntime,
  setSfccTestRuntime,
  type SfccController,
  type SfccControllerHarness,
  type SfccControllerMiddleware,
  type SfccControllerNext,
  type SfccControllerRequest,
  type SfccControllerResponse,
  type SfccControllerRoute,
  type SfccCollection,
  type SfccChunkItems,
  type SfccChunkStepFunctions,
  type SfccChunkStepResult,
  type SfccChunkStepRunOptions,
  type SfccGlobals,
  type SfccJobContext,
  type SfccJobExecution,
  type SfccIterator,
  type SfccJobStepExecution,
  type SfccJobStepHarness,
  type SfccJobStepHarnessOptions,
  type SfccJobStepModule,
  type SfccJobStepParameters,
  type SfccList,
  type SfccMapEntry,
  type SfccTestRuntime,
  type SfccTestRuntimeOptions,
} from "@commerce-klaus/sfcc-test-runtime"
import fs from "node:fs"
import path from "node:path"

const VIRTUAL_PREFIX = "\0vitest-sfcc:"
const CARTRIDGE_MODULE_SUFFIX = "?vitest-sfcc-cjs"
const ACTIVE_STEP_TYPES = Symbol.for("@commerce-klaus/vitest-sfcc.step-types")

type StepTypeGlobal = typeof globalThis & {
  [ACTIVE_STEP_TYPES]?: Map<string, ResolvedStepTypeDefinition>
}

export interface SfccLoadedJobStep {
  readonly definition: ResolvedStepTypeDefinition
  readonly jobExecution: SfccJobExecution
  readonly stepExecution: SfccJobStepExecution
  run(parameters?: SfccJobStepParameters): Promise<unknown>
}

export interface SfccVitestOptions {
  cartridgePath?: string[]
  basePath: string
  cwd?: string
  siteTemplatePath?: string
  site?: string
  solutionConfigPath?: string
  envCartridgePath?: string
  runtime?: SfccTestRuntimeOptions
}

interface VirtualModule {
  moduleId: string
  resolvedPath?: string
}

export interface SfccVitestPlugin {
  name: string
  enforce: "pre"
  config(): object
  resolveId(source: string, importer?: string): string | undefined
  transform(code: string, id: string): { code: string; map: null } | undefined
  load(id: string): string | undefined
}

function encodeVirtualModule(module: VirtualModule): string {
  return `${VIRTUAL_PREFIX}${Buffer.from(JSON.stringify(module)).toString("base64url")}`
}

function decodeVirtualModule(id: string): VirtualModule {
  return JSON.parse(
    Buffer.from(id.slice(VIRTUAL_PREFIX.length), "base64url").toString(),
  ) as VirtualModule
}

function setActiveStepTypes(definitions: ResolvedStepTypeDefinition[]): void {
  ;(globalThis as StepTypeGlobal)[ACTIVE_STEP_TYPES] = new Map(
    definitions.map((definition) => [definition.typeId, definition]),
  )
}

function normalizeParameterValue(
  typeId: string,
  parameter: StepTypeParameterDefinition,
  value: unknown,
): unknown {
  if (parameter.type === "boolean") {
    if (typeof value === "boolean") {
      return value
    }
    if (value === "true" || value === "false") {
      return value === "true"
    }
    throw new Error(`SFCC job step ${typeId} parameter ${parameter.name} must be a boolean.`)
  }

  if (parameter.type === "long" || parameter.type === "double") {
    const numberValue = typeof value === "string" && value.length > 0 ? Number(value) : value
    if (
      typeof numberValue !== "number" ||
      !Number.isFinite(numberValue) ||
      (parameter.type === "long" && !Number.isInteger(numberValue))
    ) {
      throw new Error(
        `SFCC job step ${typeId} parameter ${parameter.name} must be a ${parameter.type}.`,
      )
    }
    return numberValue
  }

  if (parameter.type === "string" || parameter.type === "time-string") {
    if (typeof value !== "string") {
      throw new Error(`SFCC job step ${typeId} parameter ${parameter.name} must be a string.`)
    }
    return parameter.trim ? value.trim() : value
  }

  return value
}

function resolveJobStepParameters(
  definition: ResolvedStepTypeDefinition,
  provided: SfccJobStepParameters = {},
): SfccJobStepParameters {
  const resolved = { ...provided }

  for (const parameter of definition.parameters) {
    let value = provided[parameter.name]
    if (value === undefined && Object.hasOwn(parameter, "defaultValue")) {
      value = parameter.defaultValue
    }
    if (typeof value === "string" && parameter.trim) {
      value = value.trim()
    }
    if (value == null || value === "") {
      if (parameter.required) {
        throw new Error(`SFCC job step ${definition.typeId} requires parameter ${parameter.name}.`)
      }
      Reflect.deleteProperty(resolved, parameter.name)
      continue
    }
    resolved[parameter.name] = normalizeParameterValue(definition.typeId, parameter, value)
  }

  return resolved
}

function getJobStepStatusCode(result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) {
    return undefined
  }
  if ("code" in result && typeof result.code === "string") {
    return result.code
  }
  if ("getCode" in result && typeof result.getCode === "function") {
    const code = result.getCode()
    return typeof code === "string" ? code : undefined
  }
  return undefined
}

function validateJobStepStatus(definition: ResolvedStepTypeDefinition, result: unknown): unknown {
  const statusResult =
    definition.kind === "chunk-script-module-step" &&
    typeof result === "object" &&
    result !== null &&
    "afterStepResult" in result
      ? result.afterStepResult
      : result
  const statusCode = getJobStepStatusCode(statusResult)
  if (
    statusCode &&
    definition.statusCodes.length > 0 &&
    !definition.statusCodes.includes(statusCode)
  ) {
    throw new Error(
      `SFCC job step ${definition.typeId} returned undeclared status code ${statusCode}. Expected one of: ${definition.statusCodes.join(", ")}.`,
    )
  }
  return result
}

async function runWithJobStepTimeout(
  typeId: string,
  timeoutSeconds: number,
  operation: () => Promise<unknown>,
): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutResult = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      const unit = timeoutSeconds === 1 ? "second" : "seconds"
      reject(new Error(`SFCC job step ${typeId} timed out after ${timeoutSeconds} ${unit}.`))
    }, timeoutSeconds * 1_000)
  })

  try {
    return await Promise.race([operation(), timeoutResult])
  } finally {
    clearTimeout(timeout)
  }
}

function isCartridgeModule(filePath: string, cartridgeRoots: string[]): boolean {
  const normalizedPath = path.resolve(filePath)
  return cartridgeRoots.some((root) => {
    const relativePath = path.relative(root, normalizedPath)
    return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)
  })
}

function markCartridgeImports(code: string, importer: string, cartridgeRoots: string[]): string {
  return code.replace(
    /(from\s*|import\s*\(\s*)(["'])([^"']+\.js)\2/g,
    (match, prefix: string, quote: string, specifier: string) => {
      if (!specifier.startsWith(".")) {
        return match
      }

      const candidatePath = path.resolve(path.dirname(importer), specifier)
      return isCartridgeModule(candidatePath, cartridgeRoots)
        ? `${prefix}${quote}${specifier}${CARTRIDGE_MODULE_SUFFIX}${quote}`
        : match
    },
  )
}

function transformCartridgeCommonJs(code: string, id: string, cartridgeRoots: string[]): string {
  let transformed = code
  let requireIndex = 0
  const requireImports: string[] = []
  const requiredBindings = new Map<string, string>()
  const constantModuleIds = new Map<string, string>()

  for (const match of transformed.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])([^"']+)\2\s*;?/g,
  )) {
    constantModuleIds.set(match[1], match[3])
  }

  const importRequiredModule = (moduleId: string): string => {
    const existingBinding = requiredBindings.get(moduleId)
    if (existingBinding) {
      return existingBinding
    }

    const importedBinding = `__sfcc_required_${requireIndex++}`
    requireImports.push(`import ${importedBinding} from ${JSON.stringify(moduleId)}`)
    requiredBindings.set(moduleId, importedBinding)
    return importedBinding
  }

  if (transformed.includes("module.superModule")) {
    const superModulePath = resolveSuperModuleFilePath(id, cartridgeRoots)
    if (superModulePath) {
      transformed =
        `import __sfcc_superModule__ from ${JSON.stringify(superModulePath)}\n` +
        transformed.replace(/\bmodule\.superModule\b/g, "__sfcc_superModule__")
    } else {
      transformed = transformed.replace(/\bmodule\.superModule\b/g, "undefined")
    }
  }

  transformed = transformed.replace(
    /\brequire\(\s*(["'])([^"']+)\1\s*\)/g,
    (_match, _quote: string, moduleId: string) => importRequiredModule(moduleId),
  )
  transformed = transformed.replace(
    /\brequire\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
    (match, constantName: string) => {
      const moduleId = constantModuleIds.get(constantName)
      return moduleId ? importRequiredModule(moduleId) : match
    },
  )
  transformed = `${requireImports.join("\n")}\n${transformed}`

  transformed = transformed.replace(
    /^\s*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/gm,
    (_match, exportName: string, binding: string) => `export { ${binding} as ${exportName} }`,
  )
  transformed = transformed.replace(
    /^\s*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/gm,
    (_match, exportName: string) => `export const ${exportName} =`,
  )
  transformed = transformed.replace(/\bmodule\.exports\s*=/g, "export default")

  if (/\brequire\s*\(/.test(transformed)) {
    throw new Error(
      `vitest-sfcc cannot transform a dynamic require() in ${id}. Use a string literal module ID.`,
    )
  }
  if (/\b(?:module\.)?exports\s*\./.test(transformed)) {
    throw new Error(
      `vitest-sfcc cannot transform this named CommonJS export in ${id}. Use a top-level export assignment.`,
    )
  }

  return transformed
}

export default function sfccVitest(options: SfccVitestOptions): SfccVitestPlugin {
  const cartridgeRoots = resolveCartridgeRoots(options)
  const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
  const hookRegistrations = findResolvedHookRegistrations(cartridgeRoots)
  const stepTypeDefinitions = findResolvedStepTypeDefinitions(cartridgeRoots)
  setActiveStepTypes(stepTypeDefinitions)
  setSfccTestRuntime(createSfccTestRuntime(options.runtime))

  const sfccPlugin: SfccVitestPlugin = {
    name: "vitest-sfcc",
    enforce: "pre",

    config() {
      return {
        test: {
          server: {
            deps: {
              inline: [/[/\\]cartridges[/\\]/],
            },
          },
        },
      }
    },

    resolveId(source, importer) {
      if (source.startsWith(VIRTUAL_PREFIX)) {
        return source
      }

      if (source.startsWith("dw/") || source === "server") {
        return encodeVirtualModule({ moduleId: source })
      }

      const resolvedSfccModule = resolveSfccModule(source, importer ?? process.cwd())
      if (resolvedSfccModule) {
        return encodeVirtualModule({ moduleId: source, resolvedPath: resolvedSfccModule })
      }

      if (source.endsWith(CARTRIDGE_MODULE_SUFFIX)) {
        const cleanSource = source.slice(0, -CARTRIDGE_MODULE_SUFFIX.length)
        const resolvedPath = path.isAbsolute(cleanSource)
          ? cleanSource
          : importer
            ? path.resolve(path.dirname(importer), cleanSource)
            : cleanSource
        return `${resolvedPath}${CARTRIDGE_MODULE_SUFFIX}`
      }

      const unresolvedCandidatePath = path.isAbsolute(source)
        ? source
        : importer && source.startsWith(".")
          ? path.resolve(path.dirname(importer), source)
          : undefined
      const candidatePath = unresolvedCandidatePath
        ? resolveCandidateFile(unresolvedCandidatePath, source)
        : undefined
      if (candidatePath && isCartridgeModule(candidatePath, cartridgeRoots)) {
        return encodeVirtualModule({ moduleId: source, resolvedPath: candidatePath })
      }

      return undefined
    },

    transform(code, id) {
      if (id.endsWith(CARTRIDGE_MODULE_SUFFIX)) {
        return {
          code: transformCartridgeCommonJs(
            code,
            id.slice(0, -CARTRIDGE_MODULE_SUFFIX.length),
            cartridgeRoots,
          ),
          map: null,
        }
      }

      const transformed = markCartridgeImports(code, id, cartridgeRoots)
      return transformed === code ? undefined : { code: transformed, map: null }
    },

    load(id) {
      if (id.endsWith(CARTRIDGE_MODULE_SUFFIX)) {
        return fs.readFileSync(id.slice(0, -CARTRIDGE_MODULE_SUFFIX.length), "utf8")
      }

      if (!id.startsWith(VIRTUAL_PREFIX)) {
        return undefined
      }

      const { moduleId, resolvedPath } = decodeVirtualModule(id)
      if (moduleId === "dw/system/HookMgr") {
        const imports = hookRegistrations
          .map(
            (registration, index) =>
              `import * as hook${index} from ${JSON.stringify(`${registration.scriptPath}${CARTRIDGE_MODULE_SUFFIX}`)}`,
          )
          .join("\n")
        const registrations = hookRegistrations
          .map(
            (registration, index) =>
              `runtime.registerHook(${JSON.stringify(registration.name)}, "default" in hook${index} ? hook${index}.default : hook${index})`,
          )
          .join("\n")

        return `${imports}
import { getSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"
const runtime = getSfccTestRuntime()
${registrations}
export default runtime.resolve("dw/system/HookMgr")
`
      }

      const fallbackImport = resolvedPath
        ? `import fallback from ${JSON.stringify(`${resolvedPath}${CARTRIDGE_MODULE_SUFFIX}`)}\n`
        : ""
      const fallbackArgument = resolvedPath ? ", () => fallback" : ""
      const resolvedArgument = resolvedPath ? `, ${JSON.stringify(resolvedPath)}` : ""

      return `${fallbackImport}import { requireSfccModule } from "@commerce-klaus/sfcc-test-runtime"
const implementation = requireSfccModule(${JSON.stringify(moduleId)}${fallbackArgument}${resolvedArgument})
export default implementation
`
    },
  }

  return sfccPlugin
}

export function getSfccRuntime(): SfccTestRuntime {
  return getSfccTestRuntime()
}

export function resetSfccRuntime(options?: SfccTestRuntimeOptions): SfccTestRuntime {
  const runtime = createSfccTestRuntime(options)
  setSfccTestRuntime(runtime)
  return runtime
}

export async function loadSfccJobStep(
  typeId: string,
  options?: SfccJobStepHarnessOptions,
): Promise<SfccLoadedJobStep> {
  const definition = (globalThis as StepTypeGlobal)[ACTIVE_STEP_TYPES]?.get(typeId)
  if (!definition) {
    throw new Error(`vitest-sfcc could not find an SFCC job step with type ID ${typeId}.`)
  }

  const importedModule = (await import(
    /* @vite-ignore */ `${definition.modulePath}${CARTRIDGE_MODULE_SUFFIX}`
  )) as SfccJobStepModule & { default?: unknown }
  const defaultExport = importedModule.default
  const jobStepModule =
    typeof defaultExport === "object" && defaultExport !== null
      ? { ...defaultExport, ...importedModule }
      : importedModule
  const harness = getSfccRuntime().jobStep(jobStepModule, {
    ...options,
    stepTypeId: definition.typeId,
  })

  return {
    definition,
    jobExecution: harness.jobExecution,
    stepExecution: harness.stepExecution,
    run: async (parameters) => {
      const resolvedParameters = resolveJobStepParameters(definition, parameters)
      const run = () =>
        definition.kind === "script-module-step"
          ? harness.run(definition.functionName, resolvedParameters)
          : harness.runChunk({
              chunkSize: definition.chunkSize,
              functions: definition.functions,
              parameters: resolvedParameters,
            })
      const result =
        definition.kind === "script-module-step" && definition.timeoutSeconds
          ? await runWithJobStepTimeout(definition.typeId, definition.timeoutSeconds, run)
          : await run()
      return validateJobStepStatus(definition, result)
    },
  }
}

export type {
  ResolvedStepTypeDefinition,
  StepTypeExecutionMetadata,
  StepTypeParameterDefinition,
  SfccController,
  SfccControllerHarness,
  SfccControllerMiddleware,
  SfccControllerNext,
  SfccControllerRequest,
  SfccControllerResponse,
  SfccControllerRoute,
  SfccCollection,
  SfccChunkItems,
  SfccChunkStepFunctions,
  SfccChunkStepResult,
  SfccChunkStepRunOptions,
  SfccGlobals,
  SfccJobContext,
  SfccJobExecution,
  SfccIterator,
  SfccJobStepExecution,
  SfccJobStepHarness,
  SfccJobStepHarnessOptions,
  SfccJobStepModule,
  SfccJobStepParameters,
  SfccList,
  SfccMapEntry,
  SfccTestRuntime,
  SfccTestRuntimeOptions,
}
