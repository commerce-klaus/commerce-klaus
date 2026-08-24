import fs from "node:fs"
import path from "node:path"

import { findContainingCartridgeRoot } from "./cartridge-order.ts"

export const SUPPORTED_RUNTIME_EXTENSIONS = ["js", "ds", "json"] as const

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
