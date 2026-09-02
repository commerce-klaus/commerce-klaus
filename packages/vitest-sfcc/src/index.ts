import {
  createSfccModuleResolver,
  findResolvedHookRegistrations,
  findResolvedStepTypeDefinitions,
  resolveCandidateFile,
  resolveCartridgeRoots,
  type ResolvedStepTypeDefinition,
  type StepTypeExecutionMetadata,
  type StepTypeParameterDefinition,
} from "@commerce-klaus/sfcc-module-resolver"
import {
  createSfccTestRuntime,
  getSfccTestRuntime,
  setSfccTestRuntime,
  type SfccArrayList,
  type SfccCalendar,
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
  type SfccHashMap,
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
  type SfccStatus,
  type SfccStatusItem,
  type SfccStringUtils,
  type SfccTestRuntime,
  type SfccTestRuntimeOptions,
} from "@commerce-klaus/sfcc-test-runtime"
import fs from "node:fs"
import path from "node:path"

import {
  CARTRIDGE_MODULE_SUFFIX,
  isCartridgeModule,
  markCartridgeImports,
  transformCartridgeCommonJs,
} from "./cartridge-transform.js"
import { setActiveStepTypes } from "./job-step.js"

const VIRTUAL_PREFIX = "\0vitest-sfcc:"

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

export { loadSfccJobStep, type SfccLoadedJobStep } from "./job-step.js"

export type {
  ResolvedStepTypeDefinition,
  StepTypeExecutionMetadata,
  StepTypeParameterDefinition,
  SfccArrayList,
  SfccCalendar,
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
  SfccHashMap,
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
  SfccStatus,
  SfccStatusItem,
  SfccStringUtils,
  SfccTestRuntime,
  SfccTestRuntimeOptions,
}
