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

const controllerRules: Linter.RulesRecord = {
  "sfcc/no-controllers": "off",
  "sitegenesis/no-global-require": "off",
}

const presetRules: Record<StorefrontPreset, Linter.RulesRecord> = {
  "storefront-next": {
    ...controllerRules,
    "sfcc/no-controllers": "error",
  },
  pwa: {
    ...controllerRules,
    "sfcc/no-controllers": "error",
  },
  sfra: controllerRules,
  "sitegenesis-controllers": {
    ...controllerRules,
    "sitegenesis/no-global-require": "error",
  },
  "sitegenesis-pipelines": {
    ...controllerRules,
    "sfcc/no-controllers": "error",
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
