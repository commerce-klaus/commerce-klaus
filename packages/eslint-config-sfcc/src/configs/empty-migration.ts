import type { Linter } from "eslint"

import sfcc from "../plugins/sfcc/index.js"
import { createRecommendedConfig, type RecommendedConfigOptions } from "./recommended.js"

export type EmptyMigrationConfigOptions = Pick<
  RecommendedConfigOptions,
  "cartridgesDir" | "files" | "ignores" | "sfcc"
>

/** Creates an ESLint overlay that reports every global empty() call and safely fixes known cases. */
export function createEmptyMigrationConfig(
  options: EmptyMigrationConfigOptions = {},
): Linter.Config[] {
  const recommendedSfccConfig = createRecommendedConfig(options)[1]

  return [
    {
      name: "@commerce-klaus/eslint-config-sfcc/empty-migration",
      files: recommendedSfccConfig?.files,
      ignores: recommendedSfccConfig?.ignores,
      plugins: { sfcc },
      rules: {
        "sfcc/no-ambiguous-empty": "error",
        "sfcc/prefer-explicit-empty-check": ["error", { autofix: true }],
      },
    },
  ]
}

const emptyMigration: Linter.Config[] = createEmptyMigrationConfig()

export default emptyMigration
