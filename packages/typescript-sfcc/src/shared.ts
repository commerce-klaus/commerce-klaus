import {
  SUPER_MODULE_TOKEN,
  SUPPORTED_RUNTIME_EXTENSIONS,
  createSfccModuleResolver,
  findCartridgesDir,
  findContainingCartridgeRoot,
  injectTopLevelStatement,
  inferCartridgeOrder as inferCartridgeOrderFromResolver,
  readSolutionReferences,
  resolveCandidateFile,
  resolveSuperModuleFilePath,
  resolveSuperModuleSpecifier,
  stripExt,
  toPosixPath,
  transformSuperModuleSource,
} from "@commerce-klaus/sfcc-module-resolver"
import path from "node:path"

export {
  SUPER_MODULE_TOKEN,
  SUPPORTED_RUNTIME_EXTENSIONS,
  createSfccModuleResolver,
  findCartridgesDir,
  findContainingCartridgeRoot,
  injectTopLevelStatement,
  readSolutionReferences,
  resolveCandidateFile,
  resolveSuperModuleFilePath,
  resolveSuperModuleSpecifier,
  stripExt,
  toPosixPath,
  transformSuperModuleSource,
}

export function inferCartridgeOrder(
  cartridgesDir: string,
  solutionConfigPath = path.join(cartridgesDir, "jsconfig.json"),
): string[] {
  return inferCartridgeOrderFromResolver({
    cartridgesDir,
    solutionConfigPath,
  })
}

export function createSfccPaths(
  configPath: string,
  cartridgeRoots: string[],
): Record<string, string[]> {
  const configDir = path.dirname(configPath)
  const cartridgesDir =
    cartridgeRoots.length > 0 ? path.dirname(cartridgeRoots[0]) : findCartridgesDir(configDir)
  const workspaceRoot = cartridgesDir ? path.dirname(cartridgesDir) : path.dirname(configDir)
  const dwTypesDir = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")
  const relativeDwTypesDir = path.relative(configDir, dwTypesDir).replaceAll("\\", "/")
  const paths: Record<string, string[]> = {
    "dw/*": [relativeDwTypesDir ? `${relativeDwTypesDir}/*` : "./*"],
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

  return paths
}
