import { createJiti } from "jiti"
import fs from "node:fs"
import path from "node:path"

export const COMMERCE_KLAUS_CONFIG_FILES = [
  "commerce-klaus.config.ts",
  "commerce-klaus.config.js",
] as const

export interface CommerceKlausConfig {
  /** Directory containing the project's cartridges. */
  cartridgesDir?: string
  /** Explicit cartridge order. The first matching cartridge wins. */
  cartridgePath?: string[]
  /** Site-template root containing sites/<site>/site.xml. */
  siteTemplatePath?: string
  /** Site identifier used to infer the cartridge path from site.xml. */
  site?: string
  /** Solution jsconfig.json or tsconfig.json used to infer cartridge order. */
  solutionConfigPath?: string
  /** Colon-separated cartridge order, matching SFCC_CARTRIDGE_PATH. */
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
