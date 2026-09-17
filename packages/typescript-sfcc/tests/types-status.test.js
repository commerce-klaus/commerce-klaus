import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, expect, test } from "vite-plus/test"

import { syncTypes } from "../src/sync-types.ts"
import { renderTypesStatus } from "../src/types-status-output.ts"
import { getTypesStatus } from "../src/types-status.ts"

const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true })
  }
})

function createProject(version = "26.7.0") {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-types-status-"))
  temporaryDirectories.push(projectDirectory)

  const typesDirectory = path.join(projectDirectory, ".b2c-script-types/types")
  fs.mkdirSync(typesDirectory, { recursive: true })
  fs.writeFileSync(path.join(typesDirectory, "global.d.ts"), "export {}\n", "utf8")
  fs.writeFileSync(
    path.join(typesDirectory, "upstream-package.json"),
    `${JSON.stringify({ version })}\n`,
    "utf8",
  )

  return projectDirectory
}

test("getTypesStatus does not create missing generated files", () => {
  const projectDirectory = createProject()
  const hookTypesPath = path.join(
    projectDirectory,
    ".b2c-script-types/types/sfcc-hooks.generated.d.ts",
  )

  const result = getTypesStatus({ currentDirectory: projectDirectory })

  expect(result.current).toBe(false)
  expect(result.generatedTypes.find((entry) => entry.name === "Hooks")?.state).toBe("missing")
  expect(fs.existsSync(hookTypesPath)).toBe(false)
})

test("getTypesStatus reports synchronized outputs as current and detects changes", () => {
  const projectDirectory = createProject()
  syncTypes({ currentDirectory: projectDirectory })

  const current = getTypesStatus({ currentDirectory: projectDirectory })

  expect(current.current).toBe(true)
  expect(current.scriptTypes.state).toBe("current")
  expect(current.generatedTypes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Hooks", state: "current" }),
      expect.objectContaining({ name: "Custom APIs", state: "not-required" }),
      expect.objectContaining({ name: "Job steps", state: "not-required" }),
    ]),
  )

  fs.appendFileSync(current.generatedTypes.find((entry) => entry.name === "Hooks").path, "stale\n")

  const stale = getTypesStatus({ currentDirectory: projectDirectory })
  expect(stale.current).toBe(false)
  expect(stale.generatedTypes.find((entry) => entry.name === "Hooks")?.state).toBe("stale")
})

test("syncTypes removes generated outputs that are no longer required", () => {
  const projectDirectory = createProject()
  const customApiTypesPath = path.join(
    projectDirectory,
    ".b2c-script-types/types/sfcc-custom-apis.generated.d.ts",
  )
  fs.writeFileSync(customApiTypesPath, "stale\n", "utf8")

  expect(
    getTypesStatus({ currentDirectory: projectDirectory }).generatedTypes.find(
      (entry) => entry.name === "Custom APIs",
    )?.state,
  ).toBe("stale")

  syncTypes({ currentDirectory: projectDirectory })

  expect(fs.existsSync(customApiTypesPath)).toBe(false)
  expect(getTypesStatus({ currentDirectory: projectDirectory }).current).toBe(true)
})

test("getTypesStatus applies the minimum Salesforce Script API type version", () => {
  const projectDirectory = createProject("26.6.0")
  syncTypes({ currentDirectory: projectDirectory })

  const result = getTypesStatus({
    currentDirectory: projectDirectory,
    minimumVersion: "26.7.0",
  })

  expect(result.current).toBe(false)
  expect(result.scriptTypes).toMatchObject({
    minimumVersion: "26.7.0",
    state: "stale",
    version: "26.6.0",
  })
})

test("renderTypesStatus uses semantic colors and recommends synchronization", () => {
  const projectDirectory = createProject()
  const result = getTypesStatus({ currentDirectory: projectDirectory })

  const output = renderTypesStatus(result, (style, text) => `<${style}>${text}</${style}>`)

  expect(output).toContain("Script API types: <green>current</green>")
  expect(output).toContain("Hooks: <red>missing</red>")
  expect(output).toContain("Custom APIs: <dim>not required</dim>")
  expect(output).toContain(
    "<red>FAIL</red>: Run <dim>b2c klaus types sync</dim> to update SFCC types.",
  )
})
