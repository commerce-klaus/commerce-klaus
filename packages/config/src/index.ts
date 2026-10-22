import { createJiti } from "jiti"
import fs from "node:fs"
import path from "node:path"

export const COMMERCE_KLAUS_CONFIG_FILES = [
  "commerce-klaus.config.ts",
  "commerce-klaus.config.js",
] as const

export const CARTRIDGE_ARCHITECTURES = [
  "storefront-next",
  "pwa",
  "sfra",
  "sitegenesis-controllers",
  "sitegenesis-pipelines",
] as const

export type CartridgeArchitecture = (typeof CARTRIDGE_ARCHITECTURES)[number]

export type CartridgeArchitectureAssignments = Partial<
  Record<CartridgeArchitecture, readonly string[]>
>

export interface CartridgeArchitectureSelection {
  /** Architecture roles whose assigned cartridges should be included. */
  architectures?: readonly CartridgeArchitecture[]
  /** Additional shared or infrastructure cartridges to include by name. */
  cartridges?: readonly string[]
  /** Include cartridges that have no architecture assignment. Defaults to false. */
  includeUnassigned?: boolean
}

export interface CommerceKlausConfig {
  /** Directory containing the project's cartridges. */
  cartridgesDir?: string
  /** Explicit cartridge order. The first matching cartridge wins. */
  cartridgePath?: string[]
  /** Architecture policy assignments by cartridge name. */
  architectures?: CartridgeArchitectureAssignments
  /** Site-template root containing sites/<site>/site.xml. */
  siteTemplatePath?: string
  /** Site identifier used to infer the cartridge path from site.xml. */
  site?: string
  /** Solution jsconfig.json or tsconfig.json used to infer cartridge order. */
  solutionConfigPath?: string
  /** Colon- or comma-separated cartridge order, matching SFCC_CARTRIDGES. */
  envCartridgePath?: string
}

export interface LoadCommerceKlausConfigOptions {
  cwd?: string
  configFile?: string | false
}

export interface LoadedCommerceKlausConfig {
  config: CommerceKlausConfig
  configFile?: string
}

export interface ResolveCommerceKlausConfigOptions extends LoadCommerceKlausConfigOptions {
  overrides?: CommerceKlausConfig
}

export function defineConfig(config: CommerceKlausConfig): CommerceKlausConfig {
  return config
}

function normalizeCartridgeNames(cartridges: readonly string[] | undefined): string[] {
  return [
    ...new Set(
      (cartridges ?? []).map((cartridge) => cartridge.trim()).filter((cartridge) => cartridge),
    ),
  ]
}

export function normalizeCartridgeArchitectureAssignments(
  assignments: CartridgeArchitectureAssignments,
): ReadonlyMap<CartridgeArchitecture, readonly string[]> {
  const supportedArchitectures = new Set<string>(CARTRIDGE_ARCHITECTURES)
  const unknownArchitecture = Object.keys(assignments).find(
    (architecture) => !supportedArchitectures.has(architecture),
  )
  if (unknownArchitecture) {
    throw new TypeError(`Unknown cartridge architecture "${unknownArchitecture}".`)
  }

  const assignedArchitecture = new Map<string, CartridgeArchitecture>()
  const normalized = new Map<CartridgeArchitecture, readonly string[]>()

  for (const architecture of CARTRIDGE_ARCHITECTURES) {
    const cartridges = normalizeCartridgeNames(assignments[architecture])
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

export function filterCartridgePathByArchitecture(
  cartridgePath: readonly string[],
  assignments: CartridgeArchitectureAssignments,
  selection: CartridgeArchitectureSelection,
): string[] {
  const normalizedAssignments = normalizeCartridgeArchitectureAssignments(assignments)
  const supportedArchitectures = new Set<string>(CARTRIDGE_ARCHITECTURES)
  const selectedArchitectures = [
    ...new Set(selection.architectures ?? []),
  ] as CartridgeArchitecture[]
  const unknownArchitecture = selectedArchitectures.find(
    (architecture) => !supportedArchitectures.has(architecture),
  )
  if (unknownArchitecture) {
    throw new TypeError(`Unknown cartridge architecture "${unknownArchitecture}".`)
  }

  const selectedCartridges = new Set(normalizeCartridgeNames(selection.cartridges))
  const assignedCartridges = new Set<string>()
  for (const [architecture, cartridges] of normalizedAssignments) {
    for (const cartridge of cartridges) {
      assignedCartridges.add(cartridge)
      if (selectedArchitectures.includes(architecture)) {
        selectedCartridges.add(cartridge)
      }
    }
  }

  return cartridgePath.filter(
    (cartridge) =>
      selectedCartridges.has(cartridge) ||
      (selection.includeUnassigned === true && !assignedCartridges.has(cartridge)),
  )
}

export function findCommerceKlausConfig(
  startDirectory: string = process.cwd(),
): string | undefined {
  let currentDirectory = path.resolve(startDirectory)

  while (true) {
    for (const fileName of COMMERCE_KLAUS_CONFIG_FILES) {
      const candidate = path.join(currentDirectory, fileName)
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate
      }
    }

    const parentDirectory = path.dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      return undefined
    }
    currentDirectory = parentDirectory
  }
}

export function loadCommerceKlausConfig(
  options: LoadCommerceKlausConfigOptions = {},
): LoadedCommerceKlausConfig {
  if (options.configFile === false) {
    return { config: {} }
  }

  const cwd = path.resolve(options.cwd ?? process.cwd())
  const configFile = options.configFile
    ? path.resolve(cwd, options.configFile)
    : findCommerceKlausConfig(cwd)
  if (!configFile) {
    return { config: {} }
  }

  const jiti = createJiti(import.meta.url, { interopDefault: true })
  const loaded = jiti(configFile) as CommerceKlausConfig | { default: CommerceKlausConfig }
  const config =
    loaded && typeof loaded === "object" && "default" in loaded ? loaded.default : loaded

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError(`Commerce Klaus config at ${configFile} must export an object.`)
  }

  return { config, configFile }
}

export function resolveCommerceKlausConfig(
  options: ResolveCommerceKlausConfigOptions = {},
): CommerceKlausConfig {
  const loaded = loadCommerceKlausConfig(options)
  const configDirectory = loaded.configFile ? path.dirname(loaded.configFile) : undefined
  const projectConfig = configDirectory
    ? resolveConfigPaths(loaded.config, configDirectory)
    : loaded.config

  return { ...projectConfig, ...removeUndefinedValues(options.overrides ?? {}) }
}

function resolveConfigPaths(
  config: CommerceKlausConfig,
  configDirectory: string,
): CommerceKlausConfig {
  return {
    ...config,
    ...(config.cartridgesDir
      ? { cartridgesDir: resolveConfigPath(config.cartridgesDir, configDirectory) }
      : {}),
    ...(config.siteTemplatePath
      ? { siteTemplatePath: resolveConfigPath(config.siteTemplatePath, configDirectory) }
      : {}),
    ...(config.solutionConfigPath
      ? { solutionConfigPath: resolveConfigPath(config.solutionConfigPath, configDirectory) }
      : {}),
  }
}

function resolveConfigPath(configPath: string, configDirectory: string): string {
  return path.isAbsolute(configPath) ? configPath : path.resolve(configDirectory, configPath)
}

function removeUndefinedValues(config: CommerceKlausConfig): CommerceKlausConfig {
  return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined))
}
