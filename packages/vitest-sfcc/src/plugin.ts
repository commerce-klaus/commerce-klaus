import {
  createSfccModuleResolver,
  findResolvedHookRegistrations,
  findResolvedStepTypeDefinitions,
  resolveCandidateFile,
  resolveCartridgeRoots,
  type SfccModuleResolutionOptions,
} from "@commerce-klaus/sfcc-module-resolver"
import {
  createSfccTestRuntime,
  setSfccTestRuntime,
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
import { encodeVirtualModule, loadVirtualModule, VIRTUAL_PREFIX } from "./virtual-modules.js"

export interface SfccVitestOptions extends SfccModuleResolutionOptions {
  runtime?: SfccTestRuntimeOptions
}

export interface SfccVitestPlugin {
  name: string
  enforce: "pre"
  config(): object
  resolveId(source: string, importer?: string): string | undefined
  transform(code: string, id: string): { code: string; map: null } | undefined
  load(id: string): string | undefined
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
      if (candidatePath?.endsWith(".js") && isCartridgeModule(candidatePath, cartridgeRoots)) {
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
      return loadVirtualModule(id, hookRegistrations)
    },
  }

  return sfccPlugin
}
