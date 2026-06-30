import path from "node:path"
import ts from "typescript"

import {
  createSfccModuleResolver,
  createSfccPaths,
  inferCartridgeOrder,
  readSolutionReferences,
  transformSuperModuleSource,
} from "./shared.ts"

export interface TypecheckOptions {
  solutionConfigPath: string
  cartridgesDir?: string
}

export function createFormatHost(currentDirectory: string): ts.FormatDiagnosticsHost {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => currentDirectory,
    getNewLine: () => ts.sys.newLine,
  }
}

export function parseConfigFile(
  configPath: string,
  currentDirectory: string,
): ts.ParsedCommandLine {
  const configParseHost: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext([diagnostic], createFormatHost(currentDirectory)),
      )
    },
  }

  const parsedConfig = ts.getParsedCommandLineOfConfigFile(configPath, {}, configParseHost)
  if (!parsedConfig) {
    throw new Error(`Could not parse TypeScript config at ${configPath}`)
  }

  return parsedConfig
}

export function runProjectTypecheck(
  configPath: string,
  cartridgeRoots: string[],
  currentDirectory: string,
): readonly ts.Diagnostic[] {
  const parsedConfig = parseConfigFile(configPath, currentDirectory)
  const existingPaths = parsedConfig.options.paths ?? {}
  parsedConfig.options.paths = {
    ...existingPaths,
    ...createSfccPaths(configPath, cartridgeRoots),
  }

  const configFilePath = parsedConfig.options.configFilePath

  const moduleResolutionCache = ts.createModuleResolutionCache(
    typeof configFilePath === "string" ? path.dirname(configFilePath) : currentDirectory,
    (fileName) => fileName,
    parsedConfig.options,
  )
  const host = ts.createCompilerHost(parsedConfig.options, true)
  const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
  const hostReadFile = host.readFile?.bind(host)
  const originalReadFile: ts.CompilerHost["readFile"] = hostReadFile
    ? (fileName) => hostReadFile(fileName)
    : (fileName) => ts.sys.readFile(fileName)

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
          extension: pathToExtension(sfccResolved),
          isExternalLibraryImport: false,
        }
      }

      return ts.resolveModuleName(
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
            extension: pathToExtension(sfccResolved),
            isExternalLibraryImport: false,
          },
        }
      }

      return {
        resolvedModule: ts.resolveModuleName(
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

  const program = ts.createProgram({
    options: parsedConfig.options,
    rootNames: parsedConfig.fileNames,
    projectReferences: parsedConfig.projectReferences,
    host,
  })

  return ts.getPreEmitDiagnostics(program)
}

export function typecheckSolutionProjects({
  solutionConfigPath,
  cartridgesDir,
}: TypecheckOptions): ts.Diagnostic[] {
  const resolvedSolutionConfigPath = path.resolve(solutionConfigPath)
  const resolvedCartridgesDir = cartridgesDir
    ? path.resolve(cartridgesDir)
    : path.dirname(resolvedSolutionConfigPath)
  const referencedConfigPaths = readSolutionReferences(resolvedSolutionConfigPath)
  const configPaths =
    referencedConfigPaths.length > 0 ? referencedConfigPaths : [resolvedSolutionConfigPath]
  const cartridgeRoots = inferCartridgeOrder(resolvedCartridgesDir, resolvedSolutionConfigPath)
  const currentDirectory = path.dirname(resolvedCartridgesDir)

  return configPaths.flatMap((configPath) =>
    runProjectTypecheck(configPath, cartridgeRoots, currentDirectory),
  )
}

export function formatDiagnostics(diagnostics: ts.Diagnostic[], currentDirectory: string): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, createFormatHost(currentDirectory))
}

function pathToExtension(filePath: string): ts.Extension {
  if (filePath.endsWith(".d.ts")) {
    return ts.Extension.Dts
  }
  if (filePath.endsWith(".tsx")) {
    return ts.Extension.Tsx
  }
  if (filePath.endsWith(".ts")) {
    return ts.Extension.Ts
  }
  if (filePath.endsWith(".jsx")) {
    return ts.Extension.Jsx
  }

  return ts.Extension.Js
}
