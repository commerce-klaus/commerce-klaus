import type { Linter } from "eslint"

import pluginESx from "eslint-plugin-es-x"
import path from "node:path"

import type { SfccSettings } from "../types/sfcc-settings.js"

import { resolveSfccSettings } from "../plugins/_utils/sfcc-settings.js"
import sfcc from "../plugins/sfcc/index.js"
import sitegenesis from "../plugins/sitegenesis/index.js"
import rules from "../rules/index.js"
import sfccLanguageGlobals from "../sfcc-language-globals.js"
import { normalizeCartridgesDir } from "./normalize-cartridges-dir.js"

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
  const { files, ignores, sfcc: sfccOptions } = options
  const centralSfccOptions = resolveSfccSettings({ configFile: sfccOptions?.configFile })
  const resolvedSfccOptions = resolveSfccSettings(sfccOptions)
  const configuredCartridgesDir =
    options.cartridgesDir ?? centralSfccOptions.cartridgesDir ?? "cartridges"
  const globCartridgesDir = path.isAbsolute(configuredCartridgesDir)
    ? path.relative(process.cwd(), configuredCartridgesDir).replaceAll(path.sep, "/") || "."
    : configuredCartridgesDir
  const normalizedCartridgesDir = normalizeCartridgesDir(globCartridgesDir)
  const targetFiles = files ?? [withBaseDir("**/*.{js,ds}")]
  const ignoredPaths = ignores ?? [
    withBaseDir("*/cartridge/client/**"),
    withBaseDir("*/cartridge/static/**"),
  ]
  const hasSfccOptions =
    Object.values(centralSfccOptions).some((value) => value !== undefined) ||
    (sfccOptions !== undefined && Object.values(sfccOptions).some((value) => value !== undefined))

  const sfccSettings: SfccSettings | undefined = hasSfccOptions
    ? {
        ...resolvedSfccOptions,
        cartridgesDir: normalizeCartridgesDir(
          sfccOptions?.cartridgesDir ??
            options.cartridgesDir ??
            resolvedSfccOptions.cartridgesDir ??
            "cartridges",
        ),
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
        globals: sfccLanguageGlobals,
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
