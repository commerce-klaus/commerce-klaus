import type { Linter } from "eslint"

import {
  CARTRIDGE_ARCHITECTURES,
  resolveCommerceKlausConfig,
  type CartridgeArchitecture,
  type CartridgeArchitectureAssignments,
  type LoadCommerceKlausConfigOptions,
} from "@commerce-klaus/config"
import path from "node:path"

import sfcc from "../plugins/sfcc/index.js"
import sitegenesis from "../plugins/sitegenesis/index.js"
import { normalizeCartridgesDir } from "./normalize-cartridges-dir.js"

export type StorefrontPreset = CartridgeArchitecture

export interface StorefrontConfigOptions {
  /** Base directory that contains all cartridges (with or without trailing /). */
  cartridgesDir?: string
  /** Cartridge names to which the storefront policy applies. */
  cartridges?: readonly string[]
  /** Optional override for file globs. */
  files?: string[]
}

export interface CartridgeArchitectureConfigOptions extends LoadCommerceKlausConfigOptions {
  /** Architecture assignments that override the central project configuration. */
  architectures?: CartridgeArchitectureAssignments
  /** Base directory that overrides the central project configuration. */
  cartridgesDir?: string
}

const baseArchitectureRules: Linter.RulesRecord = {
  "sfcc/no-controllers": "off",
  "sfcc/no-forms": "off",
  "sfcc/no-isml-rendering": "off",
  "sfcc/no-pipeline-api": "error",
  "sfcc/no-proprietary-module-syntax": "off",
  "sfcc/no-sfra-server": "off",
  "sfcc/no-storefront-isml-rendering": "off",
  "sfcc/no-template-rendering": "off",
  "sfcc/prefer-tilde-require-path": "off",
  "sitegenesis/no-global-require": "error",
}

export const cartridgeArchitectureRules: Record<StorefrontPreset, Linter.RulesRecord> = {
  "storefront-next": {
    ...baseArchitectureRules,
    "sfcc/no-controllers": "error",
    "sfcc/no-forms": "error",
    "sfcc/no-storefront-isml-rendering": "error",
    "sfcc/no-proprietary-module-syntax": ["error", { allow: ["tilde", "superModule"] }],
    "sfcc/no-sfra-server": "error",
    "sfcc/prefer-tilde-require-path": "error",
  },
  pwa: {
    ...baseArchitectureRules,
    "sfcc/no-controllers": "error",
    "sfcc/no-forms": "error",
    "sfcc/no-storefront-isml-rendering": "error",
    "sfcc/no-proprietary-module-syntax": ["error", { allow: ["tilde", "superModule"] }],
    "sfcc/no-sfra-server": "error",
    "sfcc/prefer-tilde-require-path": "error",
  },
  sfra: {
    ...baseArchitectureRules,
  },
  "sitegenesis-controllers": {
    ...baseArchitectureRules,
    "sfcc/no-sfra-server": "error",
  },
  "sitegenesis-pipelines": {
    ...baseArchitectureRules,
    "sfcc/no-pipeline-api": "off",
    "sfcc/no-sfra-server": "error",
  },
}

/** Creates a storefront policy overlay for all or selected cartridges. */
export function createStorefrontConfig(
  preset: StorefrontPreset,
  options: StorefrontConfigOptions = {},
): Linter.Config[] {
  const { cartridgesDir = "cartridges", cartridges, files } = options
  const normalizedCartridgesDir = normalizeCartridgesDir(cartridgesDir)
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
      rules: cartridgeArchitectureRules[preset],
    },
  ]
}

function normalizeArchitectureAssignments(
  assignments: CartridgeArchitectureAssignments,
): Map<StorefrontPreset, string[]> {
  const supportedArchitectures = new Set<string>(CARTRIDGE_ARCHITECTURES)
  const unknownArchitecture = Object.keys(assignments).find(
    (architecture) => !supportedArchitectures.has(architecture),
  )
  if (unknownArchitecture) {
    throw new TypeError(`Unknown cartridge architecture "${unknownArchitecture}".`)
  }

  const assignedArchitecture = new Map<string, StorefrontPreset>()
  const normalized = new Map<StorefrontPreset, string[]>()

  for (const architecture of CARTRIDGE_ARCHITECTURES) {
    const cartridges = [
      ...new Set(
        (assignments[architecture] ?? [])
          .map((cartridge) => cartridge.trim())
          .filter((cartridge) => cartridge.length > 0),
      ),
    ]

    for (const cartridge of cartridges) {
      const existingArchitecture = assignedArchitecture.get(cartridge)
      if (existingArchitecture) {
        throw new TypeError(
          `Cartridge "${cartridge}" is assigned to both "${existingArchitecture}" and "${architecture}".`,
        )
      }
      assignedArchitecture.set(cartridge, architecture)
    }

    if (cartridges.length > 0) {
      normalized.set(architecture, cartridges)
    }
  }

  return normalized
}

function getGlobCartridgesDir(cartridgesDir: string, cwd: string): string {
  if (!path.isAbsolute(cartridgesDir)) {
    return cartridgesDir
  }

  return path.relative(cwd, cartridgesDir).replaceAll(path.sep, "/") || "."
}

/** Creates cartridge-scoped ESLint overlays from central or explicit architecture assignments. */
export function createCartridgeArchitectureConfig(
  options: CartridgeArchitectureConfigOptions = {},
): Linter.Config[] {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const centralConfig = resolveCommerceKlausConfig({
    cwd,
    configFile: options.configFile,
  })
  const assignments = normalizeArchitectureAssignments(
    options.architectures ?? centralConfig.architectures ?? {},
  )
  const cartridgesDir = getGlobCartridgesDir(
    options.cartridgesDir ?? centralConfig.cartridgesDir ?? "cartridges",
    cwd,
  )

  return CARTRIDGE_ARCHITECTURES.flatMap((architecture) => {
    const cartridges = assignments.get(architecture)
    return cartridges ? createStorefrontConfig(architecture, { cartridgesDir, cartridges }) : []
  })
}

export const storefrontNext: Linter.Config[] = createStorefrontConfig("storefront-next")
export const pwa: Linter.Config[] = createStorefrontConfig("pwa")
export const sfra: Linter.Config[] = createStorefrontConfig("sfra")
export const sitegenesisControllers: Linter.Config[] =
  createStorefrontConfig("sitegenesis-controllers")
export const sitegenesisPipelines: Linter.Config[] = createStorefrontConfig("sitegenesis-pipelines")
