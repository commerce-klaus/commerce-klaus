import type { Linter } from "eslint"

import path from "node:path"

import type { SfccSettings } from "../types/sfcc-settings.js"

import { resolveSfccSettings } from "../plugins/_utils/sfcc-settings.js"
import sfcc from "../plugins/sfcc/index.js"
import { normalizeCartridgesDir } from "./normalize-cartridges-dir.js"

export interface GeneratedTypesConfigOptions {
  /** Base directory that contains all cartridges (with or without trailing /). */
  cartridgesDir?: string
  /** Optional override for file globs. */
  files?: string[]
  /** Optional shared options used to resolve effective metadata registrations. */
  sfcc?: SfccSettings
}

/** Creates an opt-in config that requires generated project types at metadata boundaries. */
export function createGeneratedTypesConfig(
  options: GeneratedTypesConfigOptions = {},
): Linter.Config[] {
  const { files, sfcc: sfccOptions } = options
  const centralSfccOptions = resolveSfccSettings({ configFile: sfccOptions?.configFile })
  const resolvedSfccOptions = resolveSfccSettings(sfccOptions)
  const configuredCartridgesDir =
    options.cartridgesDir ?? centralSfccOptions.cartridgesDir ?? "cartridges"
  const globCartridgesDir = path.isAbsolute(configuredCartridgesDir)
    ? path.relative(process.cwd(), configuredCartridgesDir).replaceAll(path.sep, "/") || "."
    : configuredCartridgesDir
  const normalizedCartridgesDir = normalizeCartridgesDir(globCartridgesDir)
  const targetFiles = files ?? [withBaseDir("**/*.{js,ds}")]

  function withBaseDir(suffix: string): string {
    return normalizedCartridgesDir === "/" ? `/${suffix}` : `${normalizedCartridgesDir}/${suffix}`
  }

  return [
    {
      name: "@commerce-klaus/eslint-config-sfcc/generated-types",
      files: targetFiles,
      plugins: { sfcc },
      settings: {
        sfcc: {
          ...resolvedSfccOptions,
          cartridgesDir: normalizeCartridgesDir(
            sfccOptions?.cartridgesDir ??
              options.cartridgesDir ??
              resolvedSfccOptions.cartridgesDir ??
              "cartridges",
          ),
        },
      },
      rules: {
        "sfcc/prefer-generated-custom-api-types": "error",
        "sfcc/prefer-generated-hook-types": "error",
        "sfcc/prefer-generated-job-step-types": "error",
      },
    },
  ]
}

const generatedTypes: Linter.Config[] = createGeneratedTypesConfig()

export default generatedTypes
