import type { Linter } from "eslint"

import sfccRules from "../rules/sfcc.js"
import sitegenesisRules from "../rules/sitegenesis.js"
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

export interface OxlintArchitectureOverride {
  files: string[]
  rules: NonNullable<Linter.Config["rules"]>
}

/** Creates Oxlint overrides from central or explicit cartridge architecture assignments. */
export function createOxlintArchitectureOverrides(
  options: CartridgeArchitectureConfigOptions = {},
): OxlintArchitectureOverride[] {
  return createCartridgeArchitectureConfig(options).flatMap((config) => {
    if (!config.files || !config.rules) {
      return []
    }

    const files: string[] = []
    for (const file of config.files) {
      if (typeof file !== "string") {
        throw new TypeError("Oxlint architecture overrides require individual file globs.")
      }
      files.push(file)
    }

    return [{ files, rules: { ...config.rules } }]
  })
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
