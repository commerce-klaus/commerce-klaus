#!/usr/bin/env node

import { spawnSync as nodeSpawnSync } from "node:child_process"
import {
  existsSync as nodeExistsSync,
  readFileSync as nodeReadFileSync,
  realpathSync as nodeRealpathSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

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
  readFileSync?: (filePath: string, encoding: BufferEncoding) => string
  spawnSync?: SpawnSyncLike
  writeStdout?: (text: string) => void
  writeStderr?: (text: string) => void
}

export function runSyncTypesCli(args: string[], options: SyncTypesCliOptions = {}): number {
  const currentDirectory = options.currentDirectory ?? process.cwd()
  const platform = options.platform ?? process.platform
  const existsSync = options.existsSync ?? nodeExistsSync
  const readFileSync = options.readFileSync ?? nodeReadFileSync
  const spawnSync = options.spawnSync ?? nodeSpawnSync
  const writeStdout = options.writeStdout ?? ((text: string) => process.stdout.write(text))
  const writeStderr = options.writeStderr ?? ((text: string) => process.stderr.write(text))

  const force = args.includes("--force")
  const minVersion = getArgValue(args, "--min-version")
  const outputPath = getArgValue(args, "--output") ?? ".b2c-script-types/jsconfig.generated.json"

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
    writeStderr(`Invalid --min-version value: ${minVersion}. Expected format: X.Y.Z\n`)
    return 1
  }

  if (!force && existsSync(markerFile)) {
    if (
      minVersionParts &&
      currentVersionParts &&
      compareSemver(currentVersionParts, minVersionParts) < 0
    ) {
      writeStdout(
        `SFCC script types version ${currentVersion} is below required ${minVersion}; refreshing vendored types.\n`,
      )
    } else if (minVersionParts && !currentVersionParts) {
      writeStdout(
        "SFCC script types version metadata is missing or invalid; refreshing vendored types.\n",
      )
    } else {
      writeStdout(
        "SFCC script types already present and up to date; skipping sync. Use --force to refresh.\n",
      )
      return 0
    }
  }

  const b2cArgs = ["setup", "ide", "vscode-types", "--copy", "--force", "--output", outputPath]
  const result = existsSync(localB2cBinary)
    ? spawnSync(localB2cBinary, b2cArgs, {
        stdio: "inherit",
        shell: platform === "win32",
      })
    : spawnSync("pnpm", ["b2c", ...b2cArgs], {
        stdio: "inherit",
        shell: platform === "win32",
      })

  return result.status ?? 1
}

export function main(args = process.argv.slice(2), options: SyncTypesCliOptions = {}): number {
  const writeStderr = options.writeStderr ?? ((text: string) => process.stderr.write(text))

  try {
    return runSyncTypesCli(args, options)
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    writeStderr(`${message}\n`)
    return 1
  }
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

function isDirectExecution(): boolean {
  const executedPath = process.argv[1]
  if (!executedPath) {
    return false
  }

  const expectedPath = fileURLToPath(import.meta.url)

  if (looksLikeSyncTypesCliEntrypoint(executedPath)) {
    return true
  }

  try {
    if (nodeExistsSync(executedPath) && nodeExistsSync(expectedPath)) {
      return nodeRealpathSync(executedPath) === nodeRealpathSync(expectedPath)
    }

    return path.resolve(executedPath) === path.resolve(expectedPath)
  } catch {
    return path.resolve(executedPath) === path.resolve(expectedPath)
  }
}

export function looksLikeSyncTypesCliEntrypoint(filePath: string): boolean {
  const fileName = path.basename(filePath)
  return (
    /^sfcc-ts-sync-types(?:\.cmd|\.ps1)?$/u.test(fileName) ||
    /^sync-types\.(?:cjs|mjs|js|ts)$/u.test(fileName)
  )
}

if (isDirectExecution()) {
  process.exit(main())
}
