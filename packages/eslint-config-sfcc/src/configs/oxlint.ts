import type { Linter } from "eslint"

import pluginESx from "eslint-plugin-es-x"

import esRules from "../rules/es.js"
import sfccRules from "../rules/sfcc.js"
import sitegenesisRules from "../rules/sitegenesis.js"
import {
  createCompatibilityConfig,
  type CompatibilityConfigOptions,
  type CompatibilityVersion,
} from "./compatibility.js"
import { createEmptyMigrationConfig, type EmptyMigrationConfigOptions } from "./empty-migration.js"
import { createGeneratedTypesConfig, type GeneratedTypesConfigOptions } from "./generated-types.js"
import { createRecommendedConfig, type RecommendedConfigOptions } from "./recommended.js"
import { createSfccTestConfig, type SfccTestConfigOptions } from "./sfcc-test.js"
import {
  cartridgeArchitectureRules,
  createCartridgeArchitectureConfig,
  createStorefrontConfig,
  type CartridgeArchitectureConfigOptions,
  type StorefrontConfigOptions,
  type StorefrontPreset,
} from "./storefront.js"

const {
  "sfcc/no-ds-files": _noDsFiles,
  "sfcc/no-e4x-syntax": _noE4xSyntax,
  "sfcc/no-type-annotations": _noTypeAnnotations,
  ...oxlintSfccRules
} = sfccRules

const restrictToES2015Rules = pluginESx.configs["restrict-to-es2015"].rules ?? {}

export const oxlintEsRules: NonNullable<Linter.Config["rules"]> = {
  ...restrictToES2015Rules,
  ...esRules,
}

export const oxlintRules: NonNullable<Linter.Config["rules"]> = {
  ...oxlintSfccRules,
  ...sitegenesisRules,
}

export interface OxlintRuleOverride {
  files: string[]
  excludeFiles?: string[]
  rules: NonNullable<Linter.Config["rules"]>
}

export type OxlintArchitectureOverride = OxlintRuleOverride

export type OxlintRecommendedOverrideOptions = Pick<
  RecommendedConfigOptions,
  "cartridgesDir" | "files" | "ignores"
>

/** Creates the Oxlint override for the same recommended JavaScript rules used by ESLint. */
export function createOxlintRecommendedOverride(
  options: OxlintRecommendedOverrideOptions = {},
): OxlintRuleOverride {
  const [config] = createRecommendedConfig(options)
  if (!config) {
    throw new TypeError("The recommended SFCC config did not produce an override.")
  }
  return toOxlintRuleOverride({
    ...config,
    rules: {
      ...oxlintEsRules,
      ...oxlintRules,
    },
  })
}

/** Creates an Oxlint overlay for an older SFCC compatibility mode. */
export function createOxlintCompatibilityOverride(
  version: CompatibilityVersion,
  options: CompatibilityConfigOptions = {},
): OxlintRuleOverride {
  const [config] = createCompatibilityConfig(version, options)
  if (!config) {
    throw new TypeError("The SFCC compatibility config did not produce an override.")
  }
  return toOxlintRuleOverride(config)
}

/** Creates the Oxlint override that requires generated project types. */
export function createOxlintGeneratedTypesOverride(
  options: Omit<GeneratedTypesConfigOptions, "sfcc"> = {},
): OxlintRuleOverride {
  const [config] = createGeneratedTypesConfig(options)
  if (!config) {
    throw new TypeError("The generated types config did not produce an override.")
  }
  return toOxlintRuleOverride(config)
}

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

/** Creates an Oxlint storefront policy overlay for all or selected cartridges. */
export function createOxlintStorefrontOverride(
  preset: StorefrontPreset,
  options: StorefrontConfigOptions = {},
): OxlintRuleOverride {
  const [config] = createStorefrontConfig(preset, options)
  if (!config) {
    throw new TypeError("The storefront config did not produce an override.")
  }
  return toOxlintRuleOverride(config)
}

/** Creates Oxlint overrides from central or explicit cartridge architecture assignments. */
export function createOxlintArchitectureOverrides(
  options: CartridgeArchitectureConfigOptions = {},
): OxlintArchitectureOverride[] {
  return createCartridgeArchitectureConfig(options).map(toOxlintRuleOverride)
}

/** Creates an Oxlint override that reports every global empty() call and safely fixes known cases. */
export function createOxlintEmptyMigrationOverride(
  options: Omit<EmptyMigrationConfigOptions, "sfcc"> = {},
): OxlintRuleOverride {
  const [config] = createEmptyMigrationConfig(options)
  if (!config) {
    throw new TypeError("The empty migration config did not produce an override.")
  }
  return toOxlintRuleOverride(config)
}

export { cartridgeArchitectureRules }

const oxlint: {
  jsPlugins: string[]
  rules: NonNullable<Linter.Config["rules"]>
  overrides: OxlintRuleOverride[]
} = {
  jsPlugins: [
    "@commerce-klaus/eslint-config-sfcc/oxlint/es-x",
    "@commerce-klaus/eslint-config-sfcc/oxlint/sfcc",
    "@commerce-klaus/eslint-config-sfcc/oxlint/sitegenesis",
  ],
  rules: {},
  overrides: [createOxlintRecommendedOverride()],
}

export default { lint: oxlint }
