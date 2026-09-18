import { resolveCommerceKlausConfig } from "@commerce-klaus/config"
import { createRequire } from "node:module"
import path from "node:path"
import ts from "typescript"

import { validateHookRegistrations } from "./hooks.ts"
import {
  createSfccModuleResolver,
  createSfccPaths,
  getAdditionalTypeFiles,
  inferCartridgeOrder,
  readSolutionReferences,
  resolveCartridgesDirFromConfig,
  resolveWorkspaceRootFromConfig,
  transformSuperModuleSource,
} from "./shared.ts"

export interface TypecheckOptions {
  solutionConfigPath?: string
  cartridgesDir?: string
  cwd?: string
  configFile?: string | false
}

type TypeScript = typeof ts

export function resolveTypeScript(currentDirectory: string): TypeScript {
  const require = createRequire(path.join(path.resolve(currentDirectory), "package.json"))

  try {
    return require("typescript") as TypeScript
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "MODULE_NOT_FOUND"
    ) {
      return ts
    }

    throw error
  }
}

export function createFormatHost(
  currentDirectory: string,
  typescript: TypeScript = ts,
): ts.FormatDiagnosticsHost {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => currentDirectory,
    getNewLine: () => typescript.sys.newLine,
  }
}

export function parseConfigFile(
  configPath: string,
  currentDirectory: string,
  typescript: TypeScript = ts,
): ts.ParsedCommandLine {
  const configParseHost: ts.ParseConfigFileHost = {
    ...typescript.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(
        typescript.formatDiagnosticsWithColorAndContext(
          [diagnostic],
          createFormatHost(currentDirectory, typescript),
        ),
      )
    },
  }

  const parsedConfig = typescript.getParsedCommandLineOfConfigFile(configPath, {}, configParseHost)
  if (!parsedConfig) {
    throw new Error(`Could not parse TypeScript config at ${configPath}`)
  }

  return parsedConfig
}

export function runProjectTypecheck(
  configPath: string,
  cartridgeRoots: string[],
  currentDirectory: string,
  typescript: TypeScript = ts,
): readonly ts.Diagnostic[] {
  const parsedConfig = parseConfigFile(configPath, currentDirectory, typescript)
  const existingPaths = parsedConfig.options.paths ?? {}
  parsedConfig.options.paths = {
    ...existingPaths,
    ...createSfccPaths(configPath, cartridgeRoots),
  }

  const configFilePath = parsedConfig.options.configFilePath

  const moduleResolutionCache = typescript.createModuleResolutionCache(
    typeof configFilePath === "string" ? path.dirname(configFilePath) : currentDirectory,
    (fileName) => fileName,
    parsedConfig.options,
  )
  const host = typescript.createCompilerHost(parsedConfig.options, true)
  const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
  const hostReadFile = host.readFile?.bind(host)
  const originalReadFile: ts.CompilerHost["readFile"] = hostReadFile
    ? (fileName) => hostReadFile(fileName)
    : (fileName) => typescript.sys.readFile(fileName)

  host.readFile = (fileName) => {
    const fileContent = originalReadFile(fileName)
    if (typeof fileContent !== "string" || !fileName.endsWith(".js")) {
      return fileContent
    }

    return transformSuperModuleSource(fileContent, fileName, cartridgeRoots)
  }

  host.resolveModuleNames = (
    moduleNames,
    containingFile,
    _reusedNames,
    redirectedReference,
    options,
  ) => {
    return moduleNames.map((moduleName) => {
      const sfccResolved = resolveSfccModule(moduleName, containingFile)
      if (sfccResolved) {
        return {
          resolvedFileName: sfccResolved,
          extension: pathToExtension(sfccResolved, typescript),
          isExternalLibraryImport: false,
        }
      }

      return typescript.resolveModuleName(
        moduleName,
        containingFile,
        options ?? parsedConfig.options,
        host,
        moduleResolutionCache,
        redirectedReference,
      ).resolvedModule
    })
  }

  host.resolveModuleNameLiterals = (
    moduleLiterals,
    containingFile,
    redirectedReference,
    options,
    _containingSourceFile,
    _reusedNames,
  ) => {
    void _containingSourceFile
    void _reusedNames

    return moduleLiterals.map((literal) => {
      const moduleName = typeof literal === "string" ? literal : literal.text
      const sfccResolved = resolveSfccModule(moduleName, containingFile)
      if (sfccResolved) {
        return {
          resolvedModule: {
            resolvedFileName: sfccResolved,
            extension: pathToExtension(sfccResolved, typescript),
            isExternalLibraryImport: false,
          },
        }
      }

      return {
        resolvedModule: typescript.resolveModuleName(
          moduleName,
          containingFile,
          options ?? parsedConfig.options,
          host,
          moduleResolutionCache,
          redirectedReference,
        ).resolvedModule,
      }
    })
  }

  const program = typescript.createProgram({
    options: parsedConfig.options,
    rootNames: withGeneratedTypeFiles(parsedConfig.fileNames, configPath, cartridgeRoots),
    projectReferences: parsedConfig.projectReferences,
    host,
  })

  return typescript.getPreEmitDiagnostics(program)
}

function withGeneratedTypeFiles(
  rootNames: string[],
  configPath: string,
  cartridgeRoots: string[],
): string[] {
  const cartridgesDir = resolveCartridgesDirFromConfig(configPath, cartridgeRoots)
  const workspaceRoot = resolveWorkspaceRootFromConfig(configPath, cartridgeRoots)
  const generatedTypePaths = getAdditionalTypeFiles({
    workspaceRoot,
    cartridgesDir,
    cartridgeRoots,
  })

  return [...rootNames, ...generatedTypePaths.filter((filePath) => !rootNames.includes(filePath))]
}

export function typecheckSolutionProjects(options: TypecheckOptions): ts.Diagnostic[] {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const typescript = resolveTypeScript(cwd)
  const centralConfig = resolveCommerceKlausConfig({
    cwd,
    configFile: options.configFile,
  })
  const configuredSolutionPath = options.solutionConfigPath ?? centralConfig.solutionConfigPath
  const resolvedSolutionConfigPath = configuredSolutionPath
    ? path.resolve(cwd, configuredSolutionPath)
    : path.resolve(cwd, centralConfig.cartridgesDir ?? "cartridges", "jsconfig.json")
  const configuredCartridgesDir = options.cartridgesDir ?? centralConfig.cartridgesDir
  const resolvedCartridgesDir = configuredCartridgesDir
    ? path.resolve(cwd, configuredCartridgesDir)
    : options.solutionConfigPath
      ? path.dirname(resolvedSolutionConfigPath)
      : path.resolve(cwd, "cartridges")
  const referencedConfigPaths = readSolutionReferences(resolvedSolutionConfigPath)
  const configPaths =
    referencedConfigPaths.length > 0 ? referencedConfigPaths : [resolvedSolutionConfigPath]
  const cartridgeRoots = inferCartridgeOrder(resolvedCartridgesDir, resolvedSolutionConfigPath)
  const currentDirectory = path.dirname(resolvedCartridgesDir)

  const typecheckDiagnostics = configPaths.flatMap((configPath) =>
    runProjectTypecheck(configPath, cartridgeRoots, currentDirectory, typescript),
  )

  return [...typecheckDiagnostics, ...validateHookRegistrations(cartridgeRoots)]
}

export function formatDiagnostics(
  diagnostics: ts.Diagnostic[],
  currentDirectory: string,
  typescript: TypeScript = resolveTypeScript(currentDirectory),
): string {
  return typescript.formatDiagnosticsWithColorAndContext(
    diagnostics,
    createFormatHost(currentDirectory, typescript),
  )
}

function pathToExtension(filePath: string, typescript: TypeScript): ts.Extension {
  if (filePath.endsWith(".d.ts")) {
    return typescript.Extension.Dts
  }
  if (filePath.endsWith(".tsx")) {
    return typescript.Extension.Tsx
  }
  if (filePath.endsWith(".ts")) {
    return typescript.Extension.Ts
  }
  if (filePath.endsWith(".jsx")) {
    return typescript.Extension.Jsx
  }

  return typescript.Extension.Js
}
