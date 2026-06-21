#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"

import { formatDiagnostics, typecheckSolutionProjects } from "./typecheck.ts"

export interface CliRunOptions {
  currentDirectory?: string
  writeStdout?: (text: string) => void
  writeStderr?: (text: string) => void
}

export function runCli(args: string[], options: CliRunOptions = {}): number {
  const currentDirectory = options.currentDirectory ?? process.cwd()
  const writeStdout = options.writeStdout ?? ((text) => process.stdout.write(text))

  const { solutionConfigPath, cartridgesDir } = parseArguments(args, currentDirectory)
  const diagnostics = typecheckSolutionProjects({ solutionConfigPath, cartridgesDir })
  const formatted = formatDiagnostics(diagnostics, currentDirectory)

  if (formatted) {
    writeStdout(formatted)
  }

  return diagnostics.length > 0 ? 2 : 0
}

export function parseArguments(
  args: string[],
  currentDirectory: string,
): { solutionConfigPath: string; cartridgesDir?: string } {
  let solutionConfigPath = path.resolve(currentDirectory, "cartridges", "jsconfig.json")
  let cartridgesDir: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if ((arg === "--project" || arg === "-p") && args[index + 1]) {
      solutionConfigPath = path.resolve(currentDirectory, args[index + 1])
      index += 1
      continue
    }

    if (arg === "--cartridges-dir" && args[index + 1]) {
      cartridgesDir = path.resolve(currentDirectory, args[index + 1])
      index += 1
    }
  }

  return { solutionConfigPath, cartridgesDir }
}

export function main(args = process.argv.slice(2), options: CliRunOptions = {}): number {
  const writeStderr = options.writeStderr ?? ((text) => process.stderr.write(text))

  try {
    return runCli(args, options)
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    writeStderr(`${message}\n`)
    return 1
  }
}

function isDirectExecution(): boolean {
  const executedPath = process.argv[1]
  if (!executedPath) {
    return false
  }

  return path.resolve(executedPath) === path.resolve(fileURLToPath(import.meta.url))
}

if (isDirectExecution()) {
  process.exit(main())
}
