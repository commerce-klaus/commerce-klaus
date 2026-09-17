#!/usr/bin/env node

import { spawnSync as nodeSpawnSync } from "node:child_process"
import {
  existsSync as nodeExistsSync,
  mkdirSync as nodeMkdirSync,
  readFileSync as nodeReadFileSync,
  writeFileSync as nodeWriteFileSync,
} from "node:fs"
import path from "node:path"

import { generateCustomApiTypes, type GenerateCustomApiTypesResult } from "./custom-apis.ts"
import {
  generateCustomAttributesTypes,
  type GenerateCustomAttributesTypesResult,
} from "./custom-attributes.ts"
import { generateHookTypes, type GenerateHookTypesResult } from "./hook-types.ts"
import { generateJobStepTypes, type GenerateJobStepTypesResult } from "./job-step-types.ts"
import { renderSyncTypesResult, type SyncTypesColorize } from "./sync-types-output.ts"

interface SpawnResultLike {
  status: number | null
}

type SpawnSyncLike = (
  command: string,
  args: string[],
  options: {
    stdio: "inherit"
    shell: boolean
  },
) => SpawnResultLike

export interface SyncTypesCliOptions {
  currentDirectory?: string
  platform?: string
  existsSync?: (filePath: string) => boolean
  mkdirSync?: (dirPath: string, options: { recursive: boolean }) => void
  readFileSync?: (filePath: string, encoding: BufferEncoding) => string
  spawnSync?: SpawnSyncLike
  writeFileSync?: (filePath: string, content: string, encoding: BufferEncoding) => void
  writeStdout?: (text: string) => void
  writeStderr?: (text: string) => void
  colorize?: SyncTypesColorize
  onResult?: (result: SyncTypesResult) => void
}

export interface SyncTypesOptions {
  currentDirectory?: string
  platform?: string
  force?: boolean
  minimumVersion?: string
  outputPath?: string
  siteTemplatePath?: string
  existsSync?: (filePath: string) => boolean
  mkdirSync?: (dirPath: string, options: { recursive: boolean }) => void
  readFileSync?: (filePath: string, encoding: BufferEncoding) => string
  spawnSync?: SpawnSyncLike
  writeFileSync?: (filePath: string, content: string, encoding: BufferEncoding) => void
}

export class SyncTypesExecutionError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message)
    this.name = "SyncTypesExecutionError"
  }
}

export interface SyncTypesResult {
  scriptTypes: {
    refreshed: boolean
    version?: string
    minimumVersion?: string
  }
  customAttributes: GenerateCustomAttributesTypesResult
  hooks: GenerateHookTypesResult
  customApis: GenerateCustomApiTypesResult
  jobSteps: GenerateJobStepTypesResult
}

export function syncTypes(options: SyncTypesOptions = {}): SyncTypesResult {
  const currentDirectory = options.currentDirectory ?? process.cwd()
  const platform = options.platform ?? process.platform
  const existsSync = options.existsSync ?? nodeExistsSync
  const mkdirSync = options.mkdirSync ?? nodeMkdirSync
  const readFileSync = options.readFileSync ?? nodeReadFileSync
  const spawnSync = options.spawnSync ?? nodeSpawnSync
  const writeFileSync = options.writeFileSync ?? nodeWriteFileSync
  const force = options.force ?? false
  const minVersion = options.minimumVersion
  const outputPath = options.outputPath ?? ".b2c-script-types/jsconfig.generated.json"
  const siteTemplatePath = options.siteTemplatePath

  const markerFile = path.resolve(currentDirectory, ".b2c-script-types/types/global.d.ts")
  const upstreamMetadataFile = path.resolve(
    currentDirectory,
    ".b2c-script-types/types/upstream-package.json",
  )
  const localB2cBinary = path.resolve(currentDirectory, "node_modules/.bin/b2c")

  const minVersionParts = parseSemver(minVersion)
  const currentVersion = readCurrentVersion(upstreamMetadataFile, existsSync, readFileSync)
  const currentVersionParts = parseSemver(currentVersion)

  if (minVersion && !minVersionParts) {
    throw new SyncTypesExecutionError(
      `Invalid --min-version value: ${minVersion}. Expected format: X.Y.Z`,
      1,
    )
  }

  const refreshRequired =
    force ||
    !existsSync(markerFile) ||
    (minVersionParts !== undefined &&
      (!currentVersionParts || compareSemver(currentVersionParts, minVersionParts) < 0))

  if (refreshRequired) {
    const b2cArgs = ["setup", "ide", "vscode-types", "--copy", "--force", "--output", outputPath]
    const commandResult = existsSync(localB2cBinary)
      ? spawnSync(localB2cBinary, b2cArgs, {
          stdio: "inherit",
          shell: platform === "win32",
        })
      : spawnSync("pnpm", ["b2c", ...b2cArgs], {
          stdio: "inherit",
          shell: platform === "win32",
        })

    const exitCode = commandResult.status ?? 1
    if (exitCode !== 0) {
      throw new SyncTypesExecutionError(
        "Salesforce Script API type synchronization failed.",
        exitCode,
      )
    }
  }

  const typesDirectory = path.resolve(currentDirectory, ".b2c-script-types", "types")
  mkdirSync(typesDirectory, { recursive: true })

  const customAttributes = generateCustomAttributesTypes({
    workspaceRoot: currentDirectory,
    siteTemplatePath,
    existsSync,
    readFileSync,
  })
  const hooks = generateHookTypes({
    workspaceRoot: currentDirectory,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
  })
  const jobSteps = generateJobStepTypes({
    workspaceRoot: currentDirectory,
    existsSync,
    mkdirSync,
    writeFileSync,
  })

  const customApis = generateCustomApiTypes({
    workspaceRoot: currentDirectory,
    existsSync,
    mkdirSync,
    writeFileSync,
  })
  return {
    scriptTypes: {
      refreshed: refreshRequired,
      version: readCurrentVersion(upstreamMetadataFile, existsSync, readFileSync),
      minimumVersion: minVersion,
    },
    customAttributes,
    hooks,
    customApis,
    jobSteps,
  }
}

export function runSyncTypesCli(args: string[], options: SyncTypesCliOptions = {}): number {
  const currentDirectory = options.currentDirectory ?? process.cwd()
  const writeStdout = options.writeStdout ?? ((text: string) => process.stdout.write(text))
  const writeStderr = options.writeStderr ?? ((text: string) => process.stderr.write(text))
  const siteTemplatePath = getArgValue(args, "--site-template-path")

  try {
    const result = syncTypes({
      currentDirectory,
      platform: options.platform,
      force: args.includes("--force"),
      minimumVersion: getArgValue(args, "--min-version"),
      outputPath: getArgValue(args, "--output"),
      siteTemplatePath,
      existsSync: options.existsSync,
      mkdirSync: options.mkdirSync,
      readFileSync: options.readFileSync,
      spawnSync: options.spawnSync,
      writeFileSync: options.writeFileSync,
    })

    renderSyncTypesResult(result, currentDirectory, siteTemplatePath, writeStdout, options.colorize)
    options.onResult?.(result)

    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeStderr(`${message}\n`)
    return error instanceof SyncTypesExecutionError ? error.exitCode : 1
  }
}

export function main(args = process.argv.slice(2), options: SyncTypesCliOptions = {}): number {
  return runSyncTypesCli(args, options)
}

function getArgValue(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`${name}=`))
  if (inline) {
    return inline.slice(name.length + 1)
  }

  const index = args.indexOf(name)
  if (index !== -1 && args[index + 1]) {
    return args[index + 1]
  }

  return undefined
}

function parseSemver(version: string | undefined): [number, number, number] | undefined {
  if (!version) {
    return undefined
  }

  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version.trim())
  if (!match) {
    return undefined
  }

  return [
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10),
    Number.parseInt(match[3], 10),
  ]
}

function compareSemver(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) {
      return 1
    }

    if (left[index] < right[index]) {
      return -1
    }
  }

  return 0
}

function readCurrentVersion(
  metadataPath: string,
  existsSync: (filePath: string) => boolean,
  readFileSync: (filePath: string, encoding: BufferEncoding) => string,
): string | undefined {
  if (!existsSync(metadataPath)) {
    return undefined
  }

  try {
    const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as { version?: unknown }
    return typeof parsed.version === "string" ? parsed.version : undefined
  } catch {
    return undefined
  }
}

export function looksLikeSyncTypesCliEntrypoint(filePath: string): boolean {
  const fileName = path.basename(filePath)
  return (
    /^sfcc-ts-sync-types(?:\.cmd|\.ps1)?$/u.test(fileName) ||
    /^sync-types\.(?:cjs|mjs|js|ts)$/u.test(fileName)
  )
}
