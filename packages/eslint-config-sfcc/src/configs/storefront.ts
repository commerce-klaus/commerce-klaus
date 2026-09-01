import type { Linter } from "eslint"

import sfcc from "../plugins/sfcc/index.js"
import sitegenesis from "../plugins/sitegenesis/index.js"

export type StorefrontPreset =
  | "storefront-next"
  | "pwa"
  | "sfra"
  | "sitegenesis-controllers"
  | "sitegenesis-pipelines"

export interface StorefrontConfigOptions {
  /** Base directory that contains all cartridges (with or without trailing /). */
  cartridgesDir?: string
  /** Cartridge names to which the storefront policy applies. */
  cartridges?: string[]
  /** Optional override for file globs. */
  files?: string[]
}

const storefrontRules: Linter.RulesRecord = {
  "sfcc/no-controllers": "off",
  "sfcc/no-isml-rendering": "off",
  "sfcc/no-pipeline-api": "off",
  "sfcc/no-sfra-server": "off",
  "sitegenesis/no-global-require": "off",
}

const presetRules: Record<StorefrontPreset, Linter.RulesRecord> = {
  "storefront-next": {
    ...storefrontRules,
    "sfcc/no-controllers": "error",
    "sfcc/no-isml-rendering": "error",
    "sfcc/no-pipeline-api": "error",
    "sfcc/no-sfra-server": "error",
  },
  pwa: {
    ...storefrontRules,
    "sfcc/no-controllers": "error",
    "sfcc/no-isml-rendering": "error",
    "sfcc/no-pipeline-api": "error",
    "sfcc/no-sfra-server": "error",
  },
  sfra: {
    ...storefrontRules,
    "sfcc/no-pipeline-api": "error",
  },
  "sitegenesis-controllers": {
    ...storefrontRules,
    "sfcc/no-sfra-server": "error",
    "sitegenesis/no-global-require": "error",
  },
  "sitegenesis-pipelines": {
    ...storefrontRules,
    "sfcc/no-controllers": "error",
    "sfcc/no-sfra-server": "error",
  },
}

/** Creates a storefront policy overlay for all or selected cartridges. */
export function createStorefrontConfig(
  preset: StorefrontPreset,
  options: StorefrontConfigOptions = {},
): Linter.Config[] {
  const { cartridgesDir = "cartridges", cartridges, files } = options
  const normalizedCartridgesDir = cartridgesDir.replace(/\/+$/u, "") || "/"
  const cartridgeNames = cartridges?.filter((cartridge) => cartridge.trim().length > 0)
  const targetFiles =
    files ??
    (cartridgeNames && cartridgeNames.length > 0
      ? cartridgeNames.map((cartridge) => withBaseDir(`${cartridge}/**/*.{js,ds}`))
      : [withBaseDir("*/**/*.{js,ds}")])

  function withBaseDir(suffix: string): string {
    return normalizedCartridgesDir === "/" ? `/${suffix}` : `${normalizedCartridgesDir}/${suffix}`
  }

  return [
    {
      name: `@commerce-klaus/eslint-config-sfcc/${preset}`,
      files: targetFiles,
      plugins: { sfcc, sitegenesis },
      rules: presetRules[preset],
    },
  ]
}

export const storefrontNext: Linter.Config[] = createStorefrontConfig("storefront-next")
export const pwa: Linter.Config[] = createStorefrontConfig("pwa")
export const sfra: Linter.Config[] = createStorefrontConfig("sfra")
export const sitegenesisControllers: Linter.Config[] =
  createStorefrontConfig("sitegenesis-controllers")
export const sitegenesisPipelines: Linter.Config[] = createStorefrontConfig("sitegenesis-pipelines")
