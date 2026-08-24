import path from "node:path"

import { findContainingCartridgeRoot } from "./cartridge-order.ts"
import { resolveCandidateFile, stripExt, toPosixPath } from "./module-resolution.ts"

export const SUPER_MODULE_TOKEN = "__sfcc_superModule__"

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
