// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports
import type { Plugin } from "vite-plus"

import fs from "node:fs"
import path from "node:path"

const EXTENSIONS = ["js", "ds", "json"]

/**
 * Configuration for SFCC module resolution.
 */
interface SfccModulesOptions {
  /** Ordered cartridge lookup path. First match wins. */
  cartridgePath: string[]
  /** Base directory that contains all cartridges from cartridgePath. */
  basePath: string
}

/**
 * Finds the first existing file for a target module path across cartridges.
 *
 * The function tries all supported extensions in cartridgePath order.
 */
function findFirst(basePath: string, cartridges: string[], target: string): string | undefined {
  for (const cartridge of cartridges) {
    for (const ext of EXTENSIONS) {
      const full = path.join(basePath, cartridge, `${target}.${ext}`)
      if (fs.existsSync(full)) return full
    }
  }
}

/** Removes only the trailing file extension from a path string. */
function stripExt(p: string): string {
  return p.replace(/\.[^.]+$/, "")
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
  basePath: rawBasePath,
}: SfccModulesOptions): Plugin {
  const basePath = path.resolve(rawBasePath)

  return {
    name: "vite-plugin-sfcc-modules",

    resolveId(source, importer) {
      if (source.startsWith("*/")) {
        const found = findFirst(basePath, cartridgePath, source.slice(2))
        if (found) return found
      }

      if (source.startsWith("~/") && importer) {
        const rel = path.relative(basePath, importer)
        const ownCartridge = rel.split(path.sep)[0]
        if (ownCartridge) {
          const found = findFirst(basePath, [ownCartridge], source.slice(2))
          if (found) return found
        }
      }

      return undefined
    },

    transform(code, id) {
      const rel = path.relative(basePath, id)
      const parts = rel.split(path.sep)
      const ownCartridge = parts[0]
      const isInCartridge = ownCartridge && cartridgePath.includes(ownCartridge)

      let transformed = code

      // Rewrite require("*/...") → require("/absolute/path")
      transformed = transformed.replace(
        /require\((['"])\*\/([^'"]+)\1\)/g,
        (_match, _quote, target) => {
          const found = findFirst(basePath, cartridgePath, `/${target}`)
          return found ? `require(${JSON.stringify(found)})` : _match
        },
      )

      // Rewrite require("~/...") → require("/absolute/path")
      if (isInCartridge) {
        transformed = transformed.replace(
          /require\((['"])~\/([^'"]+)\1\)/g,
          (_match, _quote, target) => {
            const found = findFirst(basePath, [ownCartridge], `/${target}`)
            return found ? `require(${JSON.stringify(found)})` : _match
          },
        )
      }

      // Rewrite module.superModule → static import at top of file (so Vite transforms the target too)
      if (isInCartridge && transformed.includes("module.superModule")) {
        const modulePathWithoutExt = "/" + stripExt(parts.slice(1).join("/"))
        const ownIndex = cartridgePath.indexOf(ownCartridge)
        const nextCartridges = cartridgePath.slice(ownIndex + 1)
        const found = findFirst(basePath, nextCartridges, modulePathWithoutExt)
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
