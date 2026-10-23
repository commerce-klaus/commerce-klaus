import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"
import legacyTypeScript from "typescript-legacy"

import { validateHookRegistrations } from "./hooks.ts"
import { createModuleResolver, createSfccPaths, transformSuperModuleSource } from "./shared.ts"
import {
  resolveTypecheckProjects,
  type TypecheckOptions,
  type ResolvedTypecheckProjects,
  withGeneratedTypeFiles,
} from "./typecheck.ts"
import { formatDiagnostics, resolveTypeScript, runProjectTypecheck } from "./typecheck.ts"

type NativeSyncModule = typeof import("typescript-7/sync")
type NativeFsModule = typeof import("typescript-7/fs")
type NativeDiagnostic = import("typescript-7/sync").Diagnostic

export type TypeScriptBackend = "legacy" | "native"

export type CompatibleTypecheckOptions = TypecheckOptions

export interface CompatibleDiagnostic {
  category: number
  code: number
  fileName?: string
  length?: number
  messageText: string
  start?: number
  startPosition?: {
    line: number
    character: number
  }
}

export interface CompatibleTypecheckResult {
  backend: TypeScriptBackend
  diagnostics: CompatibleDiagnostic[]
  formattedDiagnostics: string
  typescriptVersion: string
}

interface TypeScriptInstallation {
  backend: TypeScriptBackend
  packageJsonPath: string
  packageName: string
  version: string
}

export async function typecheckSolutionProjectsCompatible(
  options: CompatibleTypecheckOptions,
): Promise<CompatibleTypecheckResult> {
  const project = resolveTypecheckProjects(options)
  const installation = resolveTypeScriptInstallation(project.cwd, "typescript")

  if (installation.backend === "legacy") {
    return runLegacyTypecheck(project, installation)
  }

  return runNativeTypecheck(project, installation)
}

export function resolveTypeScriptBackend(version: string): TypeScriptBackend {
  const match = /^(\d+)\.(\d+)/u.exec(version)
  if (!match) {
    throw new Error(`Could not determine the TypeScript generation from version "${version}".`)
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  if ((major === 5 && minor >= 5) || major === 6) {
    return "legacy"
  }
  if (major === 7 && minor >= 1) {
    return "native"
  }

  throw new Error(
    `Unsupported TypeScript version ${version}. Supported versions are >=5.5 <7 and >=7.1 <8.`,
  )
}

function resolveTypeScriptInstallation(
  currentDirectory: string,
  packageName: string,
): TypeScriptInstallation {
  const require = createRequire(path.join(path.resolve(currentDirectory), "package.json"))
  let packageJsonPath: string

  try {
    packageJsonPath = require.resolve(`${packageName}/package.json`)
  } catch (error) {
    if (
      packageName === "typescript" &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "MODULE_NOT_FOUND"
    ) {
      const fallbackRequire = createRequire(import.meta.url)
      packageJsonPath = fallbackRequire.resolve("typescript-legacy/package.json")
      packageName = "typescript-legacy"
    } else {
      throw error
    }
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    version?: unknown
  }
  if (typeof packageJson.version !== "string") {
    throw new Error(`TypeScript package at ${packageJsonPath} has no valid version.`)
  }

  return {
    backend: resolveTypeScriptBackend(packageJson.version),
    packageJsonPath,
    packageName,
    version: packageJson.version,
  }
}

function runLegacyTypecheck(
  project: ResolvedTypecheckProjects,
  installation: TypeScriptInstallation,
): CompatibleTypecheckResult {
  const typescript =
    installation.packageName === "typescript" ? resolveTypeScript(project.cwd) : legacyTypeScript
  const diagnostics = project.configPaths.flatMap((configPath) =>
    runProjectTypecheck(configPath, project.cartridgeRoots, project.currentDirectory, typescript),
  )
  diagnostics.push(...validateHookRegistrations(project.cartridgeRoots))

  return {
    backend: "legacy",
    diagnostics: diagnostics.map(normalizeLegacyDiagnostic),
    formattedDiagnostics: formatDiagnostics(diagnostics, project.currentDirectory, typescript),
    typescriptVersion: installation.version,
  }
}

async function runNativeTypecheck(
  project: ResolvedTypecheckProjects,
  installation: TypeScriptInstallation,
): Promise<CompatibleTypecheckResult> {
  const require = createRequire(installation.packageJsonPath)
  const [sync, nativeFs] = await Promise.all([
    importResolvedModule<NativeSyncModule>(require.resolve(`${installation.packageName}/sync`)),
    importResolvedModule<NativeFsModule>(require.resolve(`${installation.packageName}/fs`)),
  ])
  const resolveSfccModule = createModuleResolver(project.cartridgeRoots)
  const { serverFS } = nativeFs
  const api = new sync.API({
    cwd: project.currentDirectory,
    fs: {
      directoryExists: serverFS.useOS,
      fileExists: serverFS.useOS,
      getAccessibleEntries: serverFS.useOS,
      readFile: (fileName) => {
        if (!fileName.endsWith(".js")) {
          return serverFS.useOS
        }

        try {
          const source = fs.readFileSync(fileName, "utf8")
          return transformSuperModuleSource(source, fileName, project.cartridgeRoots)
        } catch (error) {
          if (isFileNotFoundError(error)) {
            return undefined
          }
          throw error
        }
      },
      realpath: serverFS.useOS,
      removeFile: serverFS.noop,
      stat: serverFS.useOS,
      writeFile: serverFS.noop,
    },
  })
  const nativeDiagnostics: NativeDiagnostic[] = []

  try {
    for (const configPath of project.configPaths) {
      const parsedConfig = api.parseConfigFile(configPath)
      parsedConfig.options.paths = {
        ...parsedConfig.options.paths,
        ...createSfccPaths(configPath, project.cartridgeRoots),
      }
      const moduleResolver = api.createModuleResolver(parsedConfig.options, {
        resolveModuleName: (moduleName, containingDirectory) => {
          const resolvedFileName = resolveSfccModule(moduleName, containingDirectory)
          return resolvedFileName ? { resolvedFileName } : undefined
        },
      })

      try {
        const program = api.createProgram(
          withGeneratedTypeFiles(parsedConfig.fileNames, configPath, project.cartridgeRoots),
          parsedConfig.options,
          {
            configFileParsingDiagnostics: parsedConfig.errors,
            moduleResolver,
            projectReferences: parsedConfig.projectReferences,
          },
        )

        try {
          nativeDiagnostics.push(
            ...parsedConfig.errors,
            ...program.getGlobalDiagnostics(),
            ...program.getProgramDiagnostics(),
            ...program.getSyntacticDiagnostics(),
            ...program.getSemanticDiagnostics(),
          )
        } finally {
          program.dispose()
        }
      } finally {
        moduleResolver.dispose()
      }
    }
  } finally {
    api.close()
  }

  const diagnostics = dedupeDiagnostics([
    ...nativeDiagnostics.map(normalizeNativeDiagnostic),
    ...validateHookRegistrations(project.cartridgeRoots).map(normalizeLegacyDiagnostic),
  ])

  return {
    backend: "native",
    diagnostics,
    formattedDiagnostics: formatCompatibleDiagnostics(diagnostics),
    typescriptVersion: installation.version,
  }
}

function dedupeDiagnostics(diagnostics: CompatibleDiagnostic[]): CompatibleDiagnostic[] {
  return [
    ...new Map(
      diagnostics.map((diagnostic) => [
        [
          diagnostic.fileName ?? "",
          diagnostic.start ?? -1,
          diagnostic.length ?? -1,
          diagnostic.code,
          diagnostic.messageText,
        ].join(":"),
        diagnostic,
      ]),
    ).values(),
  ]
}

async function importResolvedModule<T>(filePath: string): Promise<T> {
  return (await import(pathToFileURL(filePath).href)) as T
}

function normalizeNativeDiagnostic(diagnostic: NativeDiagnostic): CompatibleDiagnostic {
  return {
    category: diagnostic.category,
    code: diagnostic.code,
    fileName: diagnostic.fileName,
    length: diagnostic.end - diagnostic.pos,
    messageText: flattenNativeDiagnostic(diagnostic),
    start: diagnostic.pos,
    startPosition: diagnostic.startPosition,
  }

  function flattenNativeDiagnostic(diagnostic: NativeDiagnostic): string {
    return [diagnostic.text, ...(diagnostic.messageChain ?? []).map(flattenNativeDiagnostic)].join(
      "\n",
    )
  }
}

function normalizeLegacyDiagnostic(diagnostic: legacyTypeScript.Diagnostic): CompatibleDiagnostic {
  const startPosition =
    diagnostic.file && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : undefined

  return {
    category: diagnostic.category,
    code: diagnostic.code,
    fileName: diagnostic.file?.fileName,
    length: diagnostic.length,
    messageText: legacyTypeScript.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    start: diagnostic.start,
    startPosition,
  }
}

function formatCompatibleDiagnostics(diagnostics: CompatibleDiagnostic[]): string {
  return diagnostics
    .map((diagnostic) => {
      const location =
        diagnostic.fileName && diagnostic.startPosition
          ? `${diagnostic.fileName}(${diagnostic.startPosition.line + 1},${diagnostic.startPosition.character + 1}): `
          : diagnostic.fileName
            ? `${diagnostic.fileName}: `
            : ""
      const category = ["warning", "error", "suggestion", "message"][diagnostic.category] ?? "error"
      return `${location}${category} TS${diagnostic.code}: ${diagnostic.messageText}`
    })
    .join("\n")
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  )
}
