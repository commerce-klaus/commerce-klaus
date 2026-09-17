import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, expect, test } from "vite-plus/test"

import { renderCleanGeneratedTypes } from "../src/clean-types-output.ts"
import { cleanGeneratedTypes } from "../src/clean-types.ts"

const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true })
  }
})

function createTypesDirectory() {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-types-clean-"))
  const typesDirectory = path.join(projectDirectory, ".b2c-script-types/types")
  temporaryDirectories.push(projectDirectory)
  fs.mkdirSync(typesDirectory, { recursive: true })
  fs.writeFileSync(path.join(typesDirectory, "sfcc-hooks.generated.d.ts"), "generated\n")
  fs.writeFileSync(path.join(typesDirectory, "global.d.ts"), "script API\n")
  fs.writeFileSync(path.join(typesDirectory, "project.d.ts"), "user declaration\n")
  return { projectDirectory, typesDirectory }
}

test("cleanGeneratedTypes removes only Commerce Klaus generated declarations", () => {
  const { projectDirectory, typesDirectory } = createTypesDirectory()

  const result = cleanGeneratedTypes({ currentDirectory: projectDirectory })

  expect(result.files.filter((file) => file.removed)).toEqual([
    {
      path: path.join(typesDirectory, "sfcc-hooks.generated.d.ts"),
      exists: true,
      removed: true,
    },
  ])
  expect(fs.existsSync(path.join(typesDirectory, "sfcc-hooks.generated.d.ts"))).toBe(false)
  expect(fs.existsSync(path.join(typesDirectory, "global.d.ts"))).toBe(true)
  expect(fs.existsSync(path.join(typesDirectory, "project.d.ts"))).toBe(true)
})

test("cleanGeneratedTypes reports files without removing them in dry-run mode", () => {
  const { projectDirectory, typesDirectory } = createTypesDirectory()

  const result = cleanGeneratedTypes({ currentDirectory: projectDirectory, dryRun: true })

  expect(result.dryRun).toBe(true)
  expect(result.files.filter((file) => file.exists)).toHaveLength(1)
  expect(result.files.filter((file) => file.removed)).toHaveLength(0)
  expect(fs.existsSync(path.join(typesDirectory, "sfcc-hooks.generated.d.ts"))).toBe(true)
})

test("renderCleanGeneratedTypes distinguishes dry-run output", () => {
  const { projectDirectory } = createTypesDirectory()
  const result = cleanGeneratedTypes({ currentDirectory: projectDirectory, dryRun: true })

  const output = renderCleanGeneratedTypes(result, (style, text) => `<${style}>${text}</${style}>`)

  expect(output).toContain("<yellow>Would remove</yellow>")
  expect(output).toContain(".b2c-script-types/types/sfcc-hooks.generated.d.ts")
  expect(output).toContain("<green>DONE</green>: Dry run found 1 generated type file.")
})
