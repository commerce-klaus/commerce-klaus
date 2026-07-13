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
import { existsSync as nodeExistsSync } from "node:fs"
import path from "node:path"

export const GENERATED_CUSTOM_ATTRIBUTES_FILE_NAME = "sfcc-custom-attributes.generated.d.ts"

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
  const workspaceRoot = resolveWorkspaceRootFromConfig(configPath, cartridgeRoots)
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

export function resolveWorkspaceRootFromConfig(
  configPath: string,
  cartridgeRoots: string[],
): string {
  const configDir = path.dirname(configPath)
  const cartridgesDir =
    cartridgeRoots.length > 0 ? path.dirname(cartridgeRoots[0]) : findCartridgesDir(configDir)
  return cartridgesDir ? path.dirname(cartridgesDir) : path.dirname(configDir)
}

export function resolveWorkspaceRootFromProjectDir(projectDir: string): string {
  const cartridgesDir = findCartridgesDir(projectDir)
  return cartridgesDir ? path.dirname(cartridgesDir) : projectDir
}

export function resolveGeneratedCustomAttributesTypesPath(workspaceRoot: string): string {
  return path.join(
    workspaceRoot,
    ".b2c-script-types",
    "types",
    GENERATED_CUSTOM_ATTRIBUTES_FILE_NAME,
  )
}

export function getGeneratedCustomAttributesTypesPathIfPresent(
  workspaceRoot: string,
  existsSync: (filePath: string) => boolean = nodeExistsSync,
): string | undefined {
  const filePath = resolveGeneratedCustomAttributesTypesPath(workspaceRoot)
  return existsSync(filePath) ? filePath : undefined
}
