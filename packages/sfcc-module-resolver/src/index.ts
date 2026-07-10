import { XMLParser } from "fast-xml-parser"
import fs from "node:fs"
import path from "node:path"

export const SUPPORTED_RUNTIME_EXTENSIONS = ["js", "ds", "json"] as const
export const SUPER_MODULE_TOKEN = "__sfcc_superModule__"

export type InferCartridgeOrderOptions = {
  cartridgesDir: string
  cwd?: string
  cartridgePath?: string[]
  siteTemplatePath?: string
  site?: string
  solutionConfigPath?: string
  envCartridgePath?: string
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
  if (!siteTemplatePath || !site) {
    return undefined
  }

  const resolvedSiteTemplatePath = path.isAbsolute(siteTemplatePath)
    ? siteTemplatePath
    : path.resolve(cwd, siteTemplatePath)

  return path.join(resolvedSiteTemplatePath, "sites", site, "site.xml")
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

export function stripExt(filePath: string): string {
  return filePath.replace(/\.[^.]+$/u, "")
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/")
}

export function resolveCandidateFile(basePath: string, moduleName: string): string | undefined {
  const candidates: string[] = []
  const extension = path.extname(basePath)

  if (extension) {
    candidates.push(basePath)
    if (extension === ".ds") {
      candidates.push(`${basePath.slice(0, -3)}.js`)
    }
  } else {
    candidates.push(basePath)
    for (const runtimeExt of SUPPORTED_RUNTIME_EXTENSIONS) {
      candidates.push(`${basePath}.${runtimeExt}`)
    }
    candidates.push(`${basePath}.d.ts`)
    for (const runtimeExt of SUPPORTED_RUNTIME_EXTENSIONS) {
      candidates.push(path.join(basePath, `index.${runtimeExt}`))
    }
    candidates.push(path.join(basePath, "index.d.ts"))

    if (moduleName.endsWith(".ds")) {
      candidates.push(`${basePath.slice(0, -3)}.js`)
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  return undefined
}

export function createSfccModuleResolver(cartridgeRoots: string[]) {
  const byAlias = new Map(cartridgeRoots.map((rootPath) => [path.basename(rootPath), rootPath]))
  const modulesRoot = byAlias.get("modules")

  return function resolveSfccModule(
    moduleName: string,
    containingFile: string,
  ): string | undefined {
    const containingCartridgeRoot = findContainingCartridgeRoot(containingFile, cartridgeRoots)

    if (moduleName === "server" && modulesRoot) {
      return resolveCandidateFile(path.join(modulesRoot, "server"), moduleName)
    }

    if (moduleName.startsWith("server/") && modulesRoot) {
      return resolveCandidateFile(path.join(modulesRoot, moduleName), moduleName)
    }

    if (moduleName.startsWith("~/")) {
      if (!containingCartridgeRoot) {
        return undefined
      }

      return resolveCandidateFile(
        path.join(containingCartridgeRoot, moduleName.slice(2)),
        moduleName,
      )
    }

    if (moduleName.startsWith("*/")) {
      const relativeToCartridge = moduleName.slice(2)
      if (!relativeToCartridge) {
        return undefined
      }

      for (const cartridgeRoot of cartridgeRoots) {
        const resolved = resolveCandidateFile(
          path.join(cartridgeRoot, relativeToCartridge),
          moduleName,
        )
        if (resolved) {
          return resolved
        }
      }
    }

    const aliasMatch = /^([A-Za-z0-9_-]+)\/(cartridge\/.*)$/u.exec(moduleName)
    if (aliasMatch) {
      const cartridgeRoot = byAlias.get(aliasMatch[1])
      if (!cartridgeRoot) {
        return undefined
      }

      return resolveCandidateFile(path.join(cartridgeRoot, aliasMatch[2]), moduleName)
    }

    return undefined
  }
}

export function resolveSuperModuleSpecifier(
  filePath: string,
  cartridgeRoots: string[],
): string | undefined {
  const resolved = resolveSuperModuleFilePath(filePath, cartridgeRoots)
  if (!resolved) {
    return undefined
  }

  const containingCartridgeRoot = findContainingCartridgeRoot(filePath, cartridgeRoots)
  if (!containingCartridgeRoot) {
    return undefined
  }
  const resolvedCartridgeRoot = findContainingCartridgeRoot(resolved, cartridgeRoots)
  if (!resolvedCartridgeRoot) {
    return undefined
  }

  const relativeModulePath = stripExt(path.relative(containingCartridgeRoot, filePath))
  return `${path.basename(resolvedCartridgeRoot)}/${toPosixPath(relativeModulePath)}`
}

export function resolveSuperModuleFilePath(
  filePath: string,
  cartridgeRoots: string[],
): string | undefined {
  const containingCartridgeRoot = findContainingCartridgeRoot(filePath, cartridgeRoots)
  if (!containingCartridgeRoot) {
    return undefined
  }

  const relativeModulePath = stripExt(path.relative(containingCartridgeRoot, filePath))
  const ownCartridgeName = path.basename(containingCartridgeRoot)
  const ownCartridgeIndex = cartridgeRoots.findIndex(
    (cartridgeRoot) => path.basename(cartridgeRoot) === ownCartridgeName,
  )
  if (ownCartridgeIndex === -1) {
    return undefined
  }

  const nextCartridges = cartridgeRoots.slice(ownCartridgeIndex + 1)
  for (const nextCartridgeRoot of nextCartridges) {
    const resolved = resolveCandidateFile(
      path.join(nextCartridgeRoot, relativeModulePath),
      relativeModulePath,
    )
    if (!resolved) {
      continue
    }

    return resolved
  }

  return undefined
}

export function injectTopLevelStatement(sourceCode: string, statement: string): string {
  if (sourceCode.startsWith("#!")) {
    const firstNewline = sourceCode.indexOf("\n")
    if (firstNewline === -1) {
      return `${sourceCode}\n${statement}\n`
    }

    const shebang = sourceCode.slice(0, firstNewline + 1)
    const rest = sourceCode.slice(firstNewline + 1)
    return `${shebang}${injectTopLevelStatement(rest, statement)}`
  }

  const useStrictMatch = sourceCode.match(/^(\s*['"]use strict['"];?\s*\r?\n)/u)
  if (useStrictMatch) {
    return `${useStrictMatch[1]}${statement}\n${sourceCode.slice(useStrictMatch[1].length)}`
  }

  return `${statement}\n${sourceCode}`
}

export function transformSuperModuleSource(
  sourceCode: string,
  filePath: string,
  cartridgeRoots: string[],
): string {
  if (!sourceCode.includes("module.superModule")) {
    return sourceCode
  }

  const superModuleSpecifier = resolveSuperModuleSpecifier(filePath, cartridgeRoots)
  if (!superModuleSpecifier) {
    return sourceCode.replaceAll(/\bmodule\.superModule\b/gu, "undefined")
  }

  const rewritten = sourceCode.replaceAll(/\bmodule\.superModule\b/gu, SUPER_MODULE_TOKEN)
  const importLine = `const ${SUPER_MODULE_TOKEN} = require(${JSON.stringify(superModuleSpecifier)});`
  return injectTopLevelStatement(rewritten, importLine)
}
