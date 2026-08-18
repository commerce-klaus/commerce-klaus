import type { Plugin } from "vite-plus"

import {
  createSfccModuleResolver,
  findContainingCartridgeRoot,
  resolveCartridgeRoots,
  resolveSuperModuleFilePath,
} from "@commerce-klaus/sfcc-module-resolver"

/**
 * Configuration for SFCC module resolution.
 */
interface SfccModulesOptions {
  /** Ordered cartridge lookup path. First match wins. */
  cartridgePath?: string[]
  /** Base directory that contains all cartridges from cartridgePath. */
  basePath: string
  /** Current working directory used to resolve relative paths. Defaults to process.cwd(). */
  cwd?: string
  /** Optional path to the site template root that contains sites/<site>/site.xml. */
  siteTemplatePath?: string
  /** Optional site id used to read custom-cartridges from sites/<site>/site.xml. */
  site?: string
  /** Optional path to cartridges/jsconfig.json used for reference-based cartridge ordering. */
  solutionConfigPath?: string
  /** Optional cartridge path string (colon-separated), same format as SFCC_CARTRIDGE_PATH. */
  envCartridgePath?: string
}

/**
 * Vite plugin to resolve SFCC-specific module patterns.
 *
 * Supported patterns:
 * - `require("<asterisk>/cartridge/...")` resolves against cartridgePath in order.
 * - `require("~/cartridge/...")` resolves in the importer's own cartridge.
 * - `module.superModule` resolves to the next matching module in cartridgePath.
 *
 * module.superModule is rewritten to a static import so Vite can transform
 * transitive super modules as part of the normal module graph.
 */
export default function sfccModules({
  cartridgePath,
  basePath,
  cwd,
  siteTemplatePath,
  site,
  solutionConfigPath,
  envCartridgePath,
}: SfccModulesOptions): Plugin {
  const cartridgeRoots = resolveCartridgeRoots({
    basePath,
    cwd,
    cartridgePath,
    siteTemplatePath,
    site,
    solutionConfigPath,
    envCartridgePath,
  })
  const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)

  return {
    name: "vite-plugin-sfcc-modules",

    resolveId(source, importer) {
      if (source.startsWith("*/")) {
        const found = resolveSfccModule(source, importer ?? process.cwd())
        if (found) return found
      }

      if (source.startsWith("~/") && importer) {
        const found = resolveSfccModule(source, importer)
        if (found) return found
      }

      return undefined
    },

    transform(code, id) {
      if (!findContainingCartridgeRoot(id, cartridgeRoots)) {
        return null
      }

      let transformed = code

      // Rewrite require("*/...") → require("/absolute/path")
      transformed = transformed.replace(
        /require\((['"])\*\/([^'"]+)\1\)/g,
        (_match, _quote, target) => {
          const found = resolveSfccModule(`*/${target}`, id)
          return found ? `require(${JSON.stringify(found)})` : _match
        },
      )

      // Rewrite require("~/...") → require("/absolute/path")
      transformed = transformed.replace(
        /require\((['"])~\/([^'"]+)\1\)/g,
        (_match, _quote, target) => {
          const found = resolveSfccModule(`~/${target}`, id)
          return found ? `require(${JSON.stringify(found)})` : _match
        },
      )

      // Rewrite module.superModule → static import at top of file (so Vite transforms the target too)
      if (transformed.includes("module.superModule")) {
        const found = resolveSuperModuleFilePath(id, cartridgeRoots)
        if (found) {
          transformed =
            `import __sfcc_superModule__ from ${JSON.stringify(found)}\n` +
            transformed.replace(/\bmodule\.superModule\b/g, "__sfcc_superModule__")
        } else {
          transformed = transformed.replace(/\bmodule\.superModule\b/g, "undefined")
        }
      }

      if (transformed === code) return null

      return { code: transformed, map: null }
    },
  }
}
