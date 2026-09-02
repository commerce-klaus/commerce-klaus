import {
  createSfccModuleResolver,
  resolveCartridgeRoots,
  resolveSuperModuleFilePath,
} from "@commerce-klaus/sfcc-module-resolver"
import {
  createSfccTestRuntime,
  getSfccTestRuntime,
  setSfccTestRuntime,
  type SfccTestRuntime,
  type SfccTestRuntimeOptions,
} from "@commerce-klaus/sfcc-test-runtime"
import fs from "node:fs"
import path from "node:path"

const VIRTUAL_PREFIX = "\0vitest-sfcc:"
const CARTRIDGE_MODULE_SUFFIX = "?vitest-sfcc-cjs"

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
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(["'])([^"']+)\2\s*\)\s*;?/g,
    (_match, binding: string, _quote: string, moduleId: string) =>
      `import ${binding} from ${JSON.stringify(moduleId)}\n`,
  )

  transformed = transformed.replace(/\bmodule\.exports\s*=/g, "export default")

  if (/\brequire\s*\(/.test(transformed)) {
    throw new Error(
      `vitest-sfcc cannot transform a dynamic or nested require() in ${id}. Use a static top-level binding.`,
    )
  }
  if (/\bexports\s*\./.test(transformed)) {
    throw new Error(
      `vitest-sfcc cannot transform named CommonJS exports in ${id} yet. Use module.exports for this initial release.`,
    )
  }

  return transformed
}

export default function sfccVitest(options: SfccVitestOptions): SfccVitestPlugin {
  const cartridgeRoots = resolveCartridgeRoots(options)
  const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
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

      if (source.startsWith("dw/")) {
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

      const candidatePath = path.isAbsolute(source)
        ? source
        : importer && source.startsWith(".")
          ? path.resolve(path.dirname(importer), source)
          : undefined
      if (
        candidatePath &&
        fs.existsSync(candidatePath) &&
        isCartridgeModule(candidatePath, cartridgeRoots)
      ) {
        return `${candidatePath}${CARTRIDGE_MODULE_SUFFIX}`
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
      const fallbackImport = resolvedPath
        ? `import fallback from ${JSON.stringify(resolvedPath)}\n`
        : ""
      const fallbackArgument = resolvedPath ? ", () => fallback" : ""

      return `${fallbackImport}import { requireSfccModule } from "@commerce-klaus/sfcc-test-runtime"
const implementation = requireSfccModule(${JSON.stringify(moduleId)}${fallbackArgument})
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

export type { SfccTestRuntime, SfccTestRuntimeOptions }
