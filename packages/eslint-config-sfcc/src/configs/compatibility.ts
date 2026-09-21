import type { Linter } from "eslint"

import pluginESx from "eslint-plugin-es-x"

import { normalizeCartridgesDir } from "./normalize-cartridges-dir.js"

export type CompatibilityVersion = "21.2" | "22.7"

export interface CompatibilityConfigOptions {
  /** Base directory that contains all cartridges (with or without trailing /). */
  cartridgesDir?: string
  /** Optional override for file globs. */
  files?: string[]
  /** Optional override for ignore globs. */
  ignores?: string[]
}

const compatibilityRules: Record<CompatibilityVersion, Linter.RulesRecord> = {
  "21.2": {
    "es-x/no-bigint": "error",
    "es-x/no-global-this": "error",
    "es-x/no-object-entries": "error",
    "es-x/no-object-fromentries": "error",
    "es-x/no-object-values": "error",
    "unicorn/prefer-bigint-literals": "off",
    "unicorn/prefer-global-this": "off",
    "unicorn/prefer-object-from-entries": "off",
  },
  "22.7": {},
}

/** Creates an additive compatibility overlay for an older SFCC compatibility mode. */
export function createCompatibilityConfig(
  version: CompatibilityVersion,
  options: CompatibilityConfigOptions = {},
): Linter.Config[] {
  const { cartridgesDir = "cartridges", files, ignores } = options
  const normalizedCartridgesDir = normalizeCartridgesDir(cartridgesDir)
  const targetFiles = files ?? [withBaseDir("**/*.{js,ds}")]
  const ignoredPaths = ignores ?? [
    withBaseDir("*/cartridge/client/**"),
    withBaseDir("*/cartridge/static/**"),
  ]

  function withBaseDir(suffix: string): string {
    return normalizedCartridgesDir === "/" ? `/${suffix}` : `${normalizedCartridgesDir}/${suffix}`
  }

  return [
    {
      name: `@commerce-klaus/eslint-config-sfcc/compatibility-${version}`,
      files: targetFiles,
      ignores: ignoredPaths,
      plugins: { "es-x": pluginESx },
      rules: compatibilityRules[version],
    },
  ]
}

export const compatibility21_2: Linter.Config[] = createCompatibilityConfig("21.2")
export const compatibility22_7: Linter.Config[] = createCompatibilityConfig("22.7")
