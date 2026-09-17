import fs from "node:fs"
import path from "node:path"

import { generateCustomApiTypes } from "./custom-apis.ts"
import { generateCustomAttributesTypes } from "./custom-attributes.ts"
import { generateHookTypes } from "./hook-types.ts"
import { generateJobStepTypes } from "./job-step-types.ts"

export type TypesStatusState = "current" | "missing" | "not-required" | "stale"

export interface TypesStatusEntry {
  name: string
  path: string
  state: TypesStatusState
}

export interface TypesStatusResult {
  current: boolean
  projectDirectory: string
  scriptTypes: TypesStatusEntry & {
    minimumVersion?: string
    version?: string
  }
  generatedTypes: TypesStatusEntry[]
}

export interface GetTypesStatusOptions {
  currentDirectory?: string
  minimumVersion?: string
  siteTemplatePath?: string
}

export function getTypesStatus(options: GetTypesStatusOptions = {}): TypesStatusResult {
  const currentDirectory = path.resolve(options.currentDirectory ?? process.cwd())
  const markerPath = path.join(currentDirectory, ".b2c-script-types/types/global.d.ts")
  const metadataPath = path.join(currentDirectory, ".b2c-script-types/types/upstream-package.json")
  const minimumVersion = options.minimumVersion
  const minimumVersionParts = parseSemver(minimumVersion)

  if (minimumVersion && !minimumVersionParts) {
    throw new Error(`Invalid --min-version value: ${minimumVersion}. Expected format: X.Y.Z`)
  }

  const version = readCurrentVersion(metadataPath)
  const versionParts = parseSemver(version)
  const scriptTypesState: TypesStatusState = !fs.existsSync(markerPath)
    ? "missing"
    : minimumVersionParts && (!versionParts || compareSemver(versionParts, minimumVersionParts) < 0)
      ? "stale"
      : "current"

  const expectedFiles = new Map<string, string>()
  const writeFileSync = (filePath: string, content: string) => {
    expectedFiles.set(filePath, content)
  }
  const mkdirSync = () => undefined

  const customAttributes = generateCustomAttributesTypes({
    workspaceRoot: currentDirectory,
    siteTemplatePath: options.siteTemplatePath,
    writeFileSync,
  })
  const hooks = generateHookTypes({
    workspaceRoot: currentDirectory,
    mkdirSync,
    writeFileSync,
  })
  const customApis = generateCustomApiTypes({
    workspaceRoot: currentDirectory,
    mkdirSync,
    writeFileSync,
  })
  const jobSteps = generateJobStepTypes({
    workspaceRoot: currentDirectory,
    mkdirSync,
    writeFileSync,
  })

  const generatedTypes = [
    getGeneratedStatus(
      "Custom attributes",
      customAttributes.outputFilePath,
      customAttributes.written,
      expectedFiles,
    ),
    getGeneratedStatus("Hooks", hooks.outputFilePath, hooks.written, expectedFiles),
    getGeneratedStatus("Custom APIs", customApis.outputFilePath, customApis.written, expectedFiles),
    getGeneratedStatus("Job steps", jobSteps.outputFilePath, jobSteps.written, expectedFiles),
  ]
  const scriptTypes: TypesStatusResult["scriptTypes"] = {
    name: "Script API types",
    path: markerPath,
    state: scriptTypesState,
    version,
    minimumVersion,
  }

  return {
    current:
      scriptTypes.state === "current" &&
      generatedTypes.every((entry) => entry.state === "current" || entry.state === "not-required"),
    projectDirectory: currentDirectory,
    scriptTypes,
    generatedTypes,
  }
}

function getGeneratedStatus(
  name: string,
  filePath: string,
  required: boolean,
  expectedFiles: Map<string, string>,
): TypesStatusEntry {
  const exists = fs.existsSync(filePath)
  const expected = expectedFiles.get(filePath)

  if (!required || expected === undefined) {
    return { name, path: filePath, state: exists ? "stale" : "not-required" }
  }

  if (!exists) {
    return { name, path: filePath, state: "missing" }
  }

  return {
    name,
    path: filePath,
    state: fs.readFileSync(filePath, "utf8") === expected ? "current" : "stale",
  }
}

function readCurrentVersion(metadataPath: string): string | undefined {
  if (!fs.existsSync(metadataPath)) {
    return undefined
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as { version?: unknown }
    return typeof parsed.version === "string" ? parsed.version : undefined
  } catch {
    return undefined
  }
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
    if (left[index] !== right[index]) {
      return left[index] > right[index] ? 1 : -1
    }
  }

  return 0
}
