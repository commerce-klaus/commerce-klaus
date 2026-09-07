import type { Linter } from "eslint"

import tsParser from "@typescript-eslint/parser"

import sfcc from "../plugins/sfcc/index.js"
import sfccLanguageGlobals from "../sfcc-language-globals.js"
import { normalizeCartridgesDir } from "./normalize-cartridges-dir.js"

export interface EslintAfterOxlintConfigOptions {
  /** Base directory that contains all cartridges (with or without trailing /). */
  cartridgesDir?: string
  /** Optional override for file globs. */
  files?: string[]
  /** Optional override for ignore globs. */
  ignores?: string[]
}

/** Creates the ESLint fallback config for rules Oxlint cannot parse. */
export function createEslintAfterOxlintConfig(
  options: EslintAfterOxlintConfigOptions = {},
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
      files: targetFiles,
      ignores: ignoredPaths,
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaFeatures: { jsx: true },
          sourceType: "commonjs",
        },
        globals: sfccLanguageGlobals,
      },
      plugins: { sfcc },
      rules: {
        "sfcc/no-ds-files": "error",
        "sfcc/no-e4x-syntax": "error",
        "sfcc/no-type-annotations": "error",
      },
    },
  ]
}

const eslintAfterOxlint: Linter.Config[] = createEslintAfterOxlintConfig()

export default eslintAfterOxlint
