import type { Linter } from "eslint"

import pluginESx from "eslint-plugin-es-x"
import globals from "globals"

import type { SfccSettings } from "../types/sfcc-settings.js"

import sfcc from "../plugins/sfcc/index.js"
import sitegenesis from "../plugins/sitegenesis/index.js"
import rules from "../rules/index.js"
import sfccGlobals from "../sfcc-globals.js"

const restrictToES2015Config = pluginESx.configs["restrict-to-es2015"]

export interface RecommendedConfigOptions {
  /** Base directory that contains all cartridges (with or without trailing /). */
  cartridgesDir?: string
  /** Optional override for file globs. */
  files?: string[]
  /** Optional override for ignore globs. */
  ignores?: string[]
  /** Optional shared options for sfcc rules. */
  sfcc?: SfccSettings
}

/** Creates the recommended flat config for SFCC projects. */
export function createRecommendedConfig(options: RecommendedConfigOptions = {}): Linter.Config[] {
  const { cartridgesDir = "cartridges", files, ignores, sfcc: sfccOptions } = options
  const normalizedCartridgesDir = cartridgesDir.replace(/\/+$/u, "") || "/"
  const targetFiles = files ?? [withBaseDir("**/*.{js,ds}")]
  const ignoredPaths = ignores ?? [
    withBaseDir("*/cartridge/client/**"),
    withBaseDir("*/cartridge/static/**"),
  ]
  const hasSfccOptions =
    sfccOptions !== undefined &&
    (sfccOptions.allowBareModules !== undefined ||
      sfccOptions.checkCartridgeExists !== undefined ||
      sfccOptions.cartridgePath !== undefined ||
      sfccOptions.cartridgesDir !== undefined ||
      sfccOptions.siteTemplatePath !== undefined ||
      sfccOptions.site !== undefined)

  const sfccSettings: SfccSettings | undefined = hasSfccOptions
    ? {
        ...sfccOptions,
        ...(sfccOptions?.cartridgesDir === undefined
          ? { cartridgesDir: normalizedCartridgesDir }
          : {}),
      }
    : undefined

  function withBaseDir(suffix: string): string {
    return normalizedCartridgesDir === "/" ? `/${suffix}` : `${normalizedCartridgesDir}/${suffix}`
  }

  // Keep baseline and SFCC-specific behavior as separate flat config entries:
  // first apply eslint-plugin-es-x restrict-to-es2015, then layer project overrides.
  return [
    {
      ...restrictToES2015Config,
      files: targetFiles,
      ignores: ignoredPaths,
    },
    {
      files: targetFiles,
      ignores: ignoredPaths,
      languageOptions: {
        sourceType: "commonjs",
        globals: {
          ...globals.commonjs,
          ...sfccGlobals,
        },
      },
      plugins: {
        sfcc,
        sitegenesis,
      },
      ...(sfccSettings === undefined ? {} : { settings: { sfcc: sfccSettings } }),
      rules,
    },
  ]
}

/** Shareable config for SFCC projects */
const recommended: Linter.Config[] = createRecommendedConfig()

export default recommended
