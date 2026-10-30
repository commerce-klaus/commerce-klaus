import type { Linter } from "eslint"

import sfccRules from "../rules/sfcc.js"
import sitegenesisRules from "../rules/sitegenesis.js"
import { createEmptyMigrationConfig, type EmptyMigrationConfigOptions } from "./empty-migration.js"
import { createSfccTestConfig, type SfccTestConfigOptions } from "./sfcc-test.js"
import {
  cartridgeArchitectureRules,
  createCartridgeArchitectureConfig,
  type CartridgeArchitectureConfigOptions,
} from "./storefront.js"

const {
  "sfcc/no-ds-files": _noDsFiles,
  "sfcc/no-e4x-syntax": _noE4xSyntax,
  "sfcc/no-type-annotations": _noTypeAnnotations,
  ...oxlintSfccRules
} = sfccRules

export const oxlintRules: Record<string, "error" | "warn"> = {
  ...oxlintSfccRules,
  ...sitegenesisRules,
} as Record<string, "error" | "warn">

export interface OxlintRuleOverride {
  files: string[]
  excludeFiles?: string[]
  rules: NonNullable<Linter.Config["rules"]>
}

export type OxlintArchitectureOverride = OxlintRuleOverride

/** Creates an opt-in Oxlint override for SFCC tests. Register the sfcc-test JS plugin separately. */
export function createOxlintSfccTestOverride(
  options: Omit<SfccTestConfigOptions, "sfcc"> = {},
): OxlintRuleOverride {
  const [config] = createSfccTestConfig(options)
  if (!config) {
    throw new TypeError("The SFCC test config did not produce an override.")
  }
  return toOxlintRuleOverride(config)
}

function getIndividualGlobs(
  globs: NonNullable<Linter.Config["files"]>,
  option: "files" | "ignores",
): string[] {
  const individualGlobs: string[] = []
  for (const glob of globs) {
    if (typeof glob !== "string") {
      throw new TypeError(`Oxlint overrides require individual ${option} globs.`)
    }
    individualGlobs.push(glob)
  }
  return individualGlobs
}

function toOxlintRuleOverride(config: Linter.Config): OxlintRuleOverride {
  if (!config.files || !config.rules) {
    throw new TypeError("Oxlint overrides require file globs and rules.")
  }

  const excludeFiles = config.ignores ? getIndividualGlobs(config.ignores, "ignores") : undefined
  return {
    files: getIndividualGlobs(config.files, "files"),
    ...(excludeFiles && excludeFiles.length > 0 ? { excludeFiles } : {}),
    rules: { ...config.rules },
  }
}

/** Creates Oxlint overrides from central or explicit cartridge architecture assignments. */
export function createOxlintArchitectureOverrides(
  options: CartridgeArchitectureConfigOptions = {},
): OxlintArchitectureOverride[] {
  return createCartridgeArchitectureConfig(options).map(toOxlintRuleOverride)
}

/** Creates an Oxlint override that reports every global empty() call and safely fixes known cases. */
export function createOxlintEmptyMigrationOverride(
  options: EmptyMigrationConfigOptions = {},
): OxlintRuleOverride {
  const [config] = createEmptyMigrationConfig(options)
  if (!config) {
    throw new TypeError("The empty migration config did not produce an override.")
  }
  return toOxlintRuleOverride(config)
}

export { cartridgeArchitectureRules }

const oxlint: { jsPlugins: string[]; rules: typeof oxlintRules } = {
  jsPlugins: [
    "@commerce-klaus/eslint-config-sfcc/oxlint/sfcc",
    "@commerce-klaus/eslint-config-sfcc/oxlint/sitegenesis",
  ],
  rules: oxlintRules,
}

export default { lint: oxlint }
