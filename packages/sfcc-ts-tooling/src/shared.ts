import fs from "node:fs"
import path from "node:path"

export const SUPPORTED_RUNTIME_EXTENSIONS = ["js", "ds", "json"] as const
export const SUPER_MODULE_TOKEN = "__sfcc_superModule__"

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

export function inferCartridgeOrder(
  cartridgesDir: string,
  solutionConfigPath = path.join(cartridgesDir, "jsconfig.json"),
): string[] {
  const configured = process.env.SFCC_CARTRIDGE_PATH
  if (configured?.trim()) {
    return configured
      .split(":")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => path.join(cartridgesDir, entry))
      .filter((entry) => fs.existsSync(entry))
  }

  let fromReferences: string[] = []
  try {
    fromReferences = readSolutionReferences(solutionConfigPath)
      .map((configPath) => path.basename(path.dirname(configPath)))
      .map((name) => path.join(cartridgesDir, name))
      .filter((cartridgeRoot) => fs.existsSync(cartridgeRoot))
  } catch {
    fromReferences = []
  }

  const fromFilesystem = fs
    .readdirSync(cartridgesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(cartridgesDir, entry.name))
    .sort((left, right) => left.localeCompare(right))

  if (fromReferences.length === 0) {
    return fromFilesystem
  }

  const seen = new Set(fromReferences)
  for (const cartridgeRoot of fromFilesystem) {
    if (!seen.has(cartridgeRoot)) {
      fromReferences.push(cartridgeRoot)
      seen.add(cartridgeRoot)
    }
  }

  return fromReferences
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

export function createSfccPaths(
  configPath: string,
  cartridgeRoots: string[],
): Record<string, string[]> {
  const configDir = path.dirname(configPath)
  const paths: Record<string, string[]> = {
    "dw/*": ["../../node_modules/sfcc-dts/@types/sfcc/dw/*"],
    "~/*": ["./*"],
  }

  for (const cartridgeRoot of cartridgeRoots) {
    const alias = path.basename(cartridgeRoot)
    const relative = path.relative(configDir, cartridgeRoot).replaceAll("\\", "/")
    paths[`${alias}/*`] = [relative ? `${relative}/*` : "./*"]
  }

  const modulesRoot = cartridgeRoots.find(
    (cartridgeRoot) => path.basename(cartridgeRoot) === "modules",
  )
  if (modulesRoot) {
    const relative = path.relative(configDir, modulesRoot).replaceAll("\\", "/")
    const base = relative || "."
    paths.server = [`${base}/server`]
    paths["server/*"] = [`${base}/server/*`]
  }

  const intNapaliRoot = cartridgeRoots.find(
    (cartridgeRoot) => path.basename(cartridgeRoot) === "int_napali",
  )
  if (intNapaliRoot) {
    const relative = path.relative(configDir, intNapaliRoot).replaceAll("\\", "/")
    paths["bc_napali/*"] = [relative ? `${relative}/*` : "./*"]
  }

  return paths
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

    return `${path.basename(nextCartridgeRoot)}/${toPosixPath(relativeModulePath)}`
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
