import fs from "node:fs"
import path from "node:path"

import {
  GENERATED_CUSTOM_APIS_FILE_NAME,
  GENERATED_CUSTOM_ATTRIBUTES_FILE_NAME,
  GENERATED_HOOK_TYPES_FILE_NAME,
  GENERATED_JOB_STEP_TYPES_FILE_NAME,
} from "./shared.ts"

export interface CleanGeneratedTypesOptions {
  currentDirectory?: string
  dryRun?: boolean
}

export interface CleanGeneratedTypesEntry {
  path: string
  exists: boolean
  removed: boolean
}

export interface CleanGeneratedTypesResult {
  projectDirectory: string
  dryRun: boolean
  files: CleanGeneratedTypesEntry[]
}

const GENERATED_FILE_NAMES = [
  GENERATED_CUSTOM_ATTRIBUTES_FILE_NAME,
  GENERATED_HOOK_TYPES_FILE_NAME,
  GENERATED_CUSTOM_APIS_FILE_NAME,
  GENERATED_JOB_STEP_TYPES_FILE_NAME,
]

export function cleanGeneratedTypes(
  options: CleanGeneratedTypesOptions = {},
): CleanGeneratedTypesResult {
  const projectDirectory = path.resolve(options.currentDirectory ?? process.cwd())
  const typesDirectory = path.join(projectDirectory, ".b2c-script-types", "types")
  const dryRun = options.dryRun ?? false
  const files = GENERATED_FILE_NAMES.map((fileName) => {
    const filePath = path.join(typesDirectory, fileName)
    const exists = fs.existsSync(filePath)
    const removed = exists && !dryRun

    if (removed) {
      fs.unlinkSync(filePath)
    }

    return { path: filePath, exists, removed }
  })

  return { projectDirectory, dryRun, files }
}
