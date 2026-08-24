import { XMLParser } from "fast-xml-parser"
import fs from "node:fs"
import path from "node:path"

export const DEFAULT_SITE_TEMPLATE_PATH = path.join("sites", "site_template")

export type InferCartridgeOrderOptions = {
  cartridgesDir: string
  cwd?: string
  cartridgePath?: string[]
  siteTemplatePath?: string
  site?: string
  solutionConfigPath?: string
  envCartridgePath?: string
}

export type ResolveCartridgeRootsOptions = {
  basePath: string
  cwd?: string
  cartridgePath?: string[]
  siteTemplatePath?: string
  site?: string
  solutionConfigPath?: string
  envCartridgePath?: string
  containingFile?: string
}

function cleanCartridgePathEntries(entries: string[] | undefined): string[] {
  if (!entries) {
    return []
  }

  return entries.map((entry) => entry.trim()).filter(Boolean)
}

export function resolveCartridgesDir(cartridgesDir: string, cwd: string): string {
  return path.isAbsolute(cartridgesDir) ? cartridgesDir : path.resolve(cwd, cartridgesDir)
}

export function resolveCartridgesBasePath(
  basePath: string,
  cwd: string,
  containingFile?: string,
): string {
  if (path.isAbsolute(basePath)) {
    return basePath
  }

  const fromCwd = path.resolve(cwd, basePath)
  if (!containingFile || fs.existsSync(fromCwd)) {
    return fromCwd
  }

  let currentDir = path.dirname(path.resolve(containingFile))
  while (true) {
    const candidate = path.resolve(currentDir, basePath)
    if (fs.existsSync(candidate)) {
      return candidate
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  return fromCwd
}

export function resolveCartridgeRoots(options: ResolveCartridgeRootsOptions): string[] {
  const cwd = options.cwd ?? process.cwd()
  const cartridgesDir = resolveCartridgesBasePath(options.basePath, cwd, options.containingFile)

  return inferCartridgeOrder({
    cartridgesDir,
    cwd,
    cartridgePath: options.cartridgePath,
    siteTemplatePath: options.siteTemplatePath,
    site: options.site,
    solutionConfigPath: options.solutionConfigPath,
    envCartridgePath: options.envCartridgePath,
  })
}

export function findCartridgesDir(startDirectory: string): string | undefined {
  let current = path.resolve(startDirectory)

  while (true) {
    if (path.basename(current) === "cartridges") {
      return current
    }

    const parent = path.dirname(current)
    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

export function readSolutionReferences(solutionConfigPath: string): string[] {
  const raw = fs.readFileSync(solutionConfigPath, "utf8")
  const parsed = JSON.parse(raw) as { references?: Array<{ path?: string }> }
  const references = Array.isArray(parsed.references) ? parsed.references : []

  return references.map((reference) => {
    const absoluteReference = path.resolve(path.dirname(solutionConfigPath), reference.path ?? "")
    if (absoluteReference.endsWith(".json")) {
      return absoluteReference
    }

    return path.join(absoluteReference, "jsconfig.json")
  })
}

function resolveSiteTemplateXmlPath(
  siteTemplatePath: string | undefined,
  site: string | undefined,
  cwd: string,
): string | undefined {
  if (!site) {
    return undefined
  }

  const resolvedSiteTemplatePath = resolveSiteTemplatePath(
    siteTemplatePath,
    cwd,
    DEFAULT_SITE_TEMPLATE_PATH,
  )
  if (!resolvedSiteTemplatePath) {
    return undefined
  }

  return path.join(resolvedSiteTemplatePath, "sites", site, "site.xml")
}

export function resolveSiteTemplatePath(
  siteTemplatePath: string | undefined,
  cwd: string,
  fallbackPath?: string,
): string | undefined {
  const effectivePath = siteTemplatePath ?? fallbackPath
  if (!effectivePath) {
    return undefined
  }

  return path.isAbsolute(effectivePath) ? effectivePath : path.resolve(cwd, effectivePath)
}

function findCustomCartridges(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCustomCartridges(item)
      if (found) {
        return found
      }
    }

    return undefined
  }

  const objectValue = value as Record<string, unknown>
  const directValue = objectValue["custom-cartridges"]
  if (typeof directValue === "string") {
    return directValue
  }

  for (const nestedValue of Object.values(objectValue)) {
    const found = findCustomCartridges(nestedValue)
    if (found) {
      return found
    }
  }

  return undefined
}

export function getSiteTemplateCartridgePath(
  siteTemplatePath: string | undefined,
  site: string | undefined,
  cwd: string,
): string[] {
  const siteTemplateXmlPath = resolveSiteTemplateXmlPath(siteTemplatePath, site, cwd)
  if (!siteTemplateXmlPath) {
    return []
  }

  try {
    const xmlContent = fs.readFileSync(siteTemplateXmlPath, "utf8")
    const parser = new XMLParser({
      ignoreAttributes: true,
      trimValues: true,
      parseTagValue: false,
      parseAttributeValue: false,
    })
    const parsed = parser.parse(xmlContent) as unknown
    const customCartridges = findCustomCartridges(parsed)

    if (!customCartridges) {
      return []
    }

    return customCartridges
      .split(":")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  } catch {
    return []
  }
}

function toExistingCartridgeRoots(baseDir: string, cartridgeNames: string[]): string[] {
  return cartridgeNames
    .map((entry) => path.join(baseDir, entry))
    .filter((entry) => fs.existsSync(entry))
}

function getFilesystemCartridgeRoots(baseDir: string): string[] {
  try {
    return fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(baseDir, entry.name))
      .sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

export function inferCartridgeOrder(options: InferCartridgeOrderOptions): string[] {
  const cwd = options.cwd ?? process.cwd()
  const baseDir = resolveCartridgesDir(options.cartridgesDir, cwd)

  const configured = cleanCartridgePathEntries(options.cartridgePath)
  if (configured.length > 0) {
    return toExistingCartridgeRoots(baseDir, configured)
  }

  const configuredEnv = cleanCartridgePathEntries(
    options.envCartridgePath
      ? options.envCartridgePath.split(":")
      : process.env.SFCC_CARTRIDGE_PATH?.split(":"),
  )
  if (configuredEnv.length > 0) {
    return toExistingCartridgeRoots(baseDir, configuredEnv)
  }

  const solutionConfigPath =
    options.solutionConfigPath ??
    path.join(resolveCartridgesDir(options.cartridgesDir, cwd), "jsconfig.json")

  try {
    const fromReferences = readSolutionReferences(solutionConfigPath)
      .map((configPath) => path.basename(path.dirname(configPath)))
      .map((name) => path.join(baseDir, name))
      .filter((cartridgeRoot) => fs.existsSync(cartridgeRoot))

    if (fromReferences.length > 0) {
      const fromFilesystem = getFilesystemCartridgeRoots(baseDir)
      const seen = new Set(fromReferences)
      for (const cartridgeRoot of fromFilesystem) {
        if (!seen.has(cartridgeRoot)) {
          fromReferences.push(cartridgeRoot)
          seen.add(cartridgeRoot)
        }
      }

      return fromReferences
    }
  } catch {
    // Fall through to site-template and filesystem fallback.
  }

  const fromSiteTemplate = getSiteTemplateCartridgePath(options.siteTemplatePath, options.site, cwd)
  if (fromSiteTemplate.length > 0) {
    return toExistingCartridgeRoots(baseDir, fromSiteTemplate)
  }

  return getFilesystemCartridgeRoots(baseDir)
}

export function findContainingCartridgeRoot(
  filePath: string,
  cartridgeRoots: string[],
): string | undefined {
  const normalizedPath = path.resolve(filePath)
  return cartridgeRoots.find((cartridgeRoot) =>
    normalizedPath.startsWith(`${cartridgeRoot}${path.sep}`),
  )
}
