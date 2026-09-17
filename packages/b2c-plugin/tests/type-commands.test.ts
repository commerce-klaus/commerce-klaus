import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import Typecheck from "../src/commands/klaus/types/check.ts"
import SyncTypes, { createB2cCommandArgs } from "../src/commands/klaus/types/sync.ts"

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

test("uses the project's TypeScript SFCC package as a peer", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
  }

  expect(manifest.dependencies?.["@commerce-klaus/typescript-sfcc"]).toBeUndefined()
  expect(manifest.peerDependencies?.["@commerce-klaus/typescript-sfcc"]).toBe("^1.6.0")
})

test("type commands support B2C CLI JSON output", () => {
  expect(Typecheck.enableJsonFlag).toBe(true)
  expect(SyncTypes.enableJsonFlag).toBe(true)
})

describe("createB2cCommandArgs", () => {
  test("removes the pnpm executable alias before delegating to the active B2C CLI", () => {
    expect(
      createB2cCommandArgs("pnpm", ["b2c", "setup", "ide", "vscode-types"], "/project"),
    ).toEqual(["setup", "ide", "vscode-types", "--project-directory", "/project"])
  })

  test("preserves arguments from a direct B2C executable", () => {
    expect(
      createB2cCommandArgs(
        "/project/node_modules/.bin/b2c",
        ["setup", "ide", "vscode-types"],
        "/project",
      ),
    ).toEqual(["setup", "ide", "vscode-types", "--project-directory", "/project"])
  })
})
