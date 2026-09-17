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

export function getCandidateFilePaths(basePath: string, moduleName: string): string[] {
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

  return candidates
}

export function resolveCandidateFile(basePath: string, moduleName: string): string | undefined {
  const candidates = getCandidateFilePaths(basePath, moduleName)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  return undefined
}

export type SfccModuleResolutionKind =
  | "cartridge-alias"
  | "cartridge-relative"
  | "server"
  | "super-module"
  | "unsupported"
  | "wildcard"

export interface SfccModuleResolutionAttempt {
  cartridge?: string
  candidates: string[]
  resolved?: string
}

export interface SfccModuleResolutionTrace {
  moduleName: string
  kind: SfccModuleResolutionKind
  containingCartridge?: string
  resolved?: string
  attempts: SfccModuleResolutionAttempt[]
}

export function explainSfccModuleResolution(
  moduleName: string,
  containingFile: string,
  cartridgeRoots: string[],
): SfccModuleResolutionTrace {
  const byAlias = new Map(cartridgeRoots.map((rootPath) => [path.basename(rootPath), rootPath]))
  const modulesRoot = byAlias.get("modules")
  const containingCartridgeRoot = findContainingCartridgeRoot(containingFile, cartridgeRoots)
  let kind: SfccModuleResolutionKind = "unsupported"
  const targets: Array<{ basePath: string; cartridge?: string }> = []

  if (moduleName === "module.superModule") {
    kind = "super-module"
    if (containingCartridgeRoot) {
      const ownIndex = cartridgeRoots.indexOf(containingCartridgeRoot)
      const relativeModulePath = stripExt(path.relative(containingCartridgeRoot, containingFile))
      for (const cartridgeRoot of cartridgeRoots.slice(ownIndex + 1)) {
        targets.push({
          basePath: path.join(cartridgeRoot, relativeModulePath),
          cartridge: cartridgeRoot,
        })
      }
    }
  } else if (moduleName === "server" && modulesRoot) {
    kind = "server"
    targets.push({ basePath: path.join(modulesRoot, "server"), cartridge: modulesRoot })
  } else if (moduleName.startsWith("server/") && modulesRoot) {
    kind = "server"
    targets.push({ basePath: path.join(modulesRoot, moduleName), cartridge: modulesRoot })
  } else if (moduleName.startsWith("~/")) {
    kind = "cartridge-relative"
    if (containingCartridgeRoot) {
      targets.push({
        basePath: path.join(containingCartridgeRoot, moduleName.slice(2)),
        cartridge: containingCartridgeRoot,
      })
    }
  } else if (moduleName.startsWith("*/") && moduleName.length > 2) {
    kind = "wildcard"
    for (const cartridgeRoot of cartridgeRoots) {
      targets.push({
        basePath: path.join(cartridgeRoot, moduleName.slice(2)),
        cartridge: cartridgeRoot,
      })
    }
  } else {
    const aliasMatch = /^([A-Za-z0-9_-]+)\/(cartridge\/.*)$/u.exec(moduleName)
    if (aliasMatch) {
      kind = "cartridge-alias"
      const cartridgeRoot = byAlias.get(aliasMatch[1])
      if (cartridgeRoot) {
        targets.push({
          basePath: path.join(cartridgeRoot, aliasMatch[2]),
          cartridge: cartridgeRoot,
        })
      }
    }
  }

  const attempts: SfccModuleResolutionAttempt[] = []
  let resolved: string | undefined
  for (const target of targets) {
    const candidates = getCandidateFilePaths(target.basePath, moduleName)
    const match = candidates.find(
      (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    )
    attempts.push({
      ...(target.cartridge ? { cartridge: target.cartridge } : {}),
      candidates,
      ...(match ? { resolved: match } : {}),
    })
    if (match) {
      resolved = match
      break
    }
  }

  return {
    moduleName,
    kind,
    ...(containingCartridgeRoot ? { containingCartridge: containingCartridgeRoot } : {}),
    ...(resolved ? { resolved } : {}),
    attempts,
  }
}

export function createSfccModuleResolver(cartridgeRoots: string[]) {
  return function resolveSfccModule(
    moduleName: string,
    containingFile: string,
  ): string | undefined {
    return explainSfccModuleResolution(moduleName, containingFile, cartridgeRoots).resolved
  }
}
