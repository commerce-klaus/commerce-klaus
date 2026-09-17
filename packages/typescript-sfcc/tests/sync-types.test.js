import { expect, test } from "vite-plus/test"

import { looksLikeSyncTypesCliEntrypoint, runSyncTypesCli } from "../src/sync-types.ts"

function createFakeEnvironment({
  colorize,
  files = [],
  metadataVersion,
  localBinary = false,
} = {}) {
  const fileSet = new Set(files)
  const calls = []
  let stdout = ""
  let stderr = ""
  let syncResult

  const cwd = "/workspace"
  const markerFile = "/workspace/.b2c-script-types/types/global.d.ts"
  const metadataFile = "/workspace/.b2c-script-types/types/upstream-package.json"
  const localB2c = "/workspace/node_modules/.bin/b2c"

  if (localBinary) {
    fileSet.add(localB2c)
  }

  return {
    calls,
    get stdout() {
      return stdout
    },
    get stderr() {
      return stderr
    },
    get result() {
      return syncResult
    },
    run(args) {
      return runSyncTypesCli(args, {
        currentDirectory: cwd,
        platform: "linux",
        existsSync: (filePath) => {
          if (filePath === markerFile) {
            return fileSet.has(markerFile)
          }

          if (filePath === metadataFile) {
            return fileSet.has(metadataFile)
          }

          if (filePath === localB2c) {
            return fileSet.has(localB2c)
          }

          return false
        },
        readFileSync: (filePath) => {
          if (filePath === metadataFile) {
            return JSON.stringify({ version: metadataVersion })
          }

          throw new Error(`Unexpected read: ${filePath}`)
        },
        spawnSync: (command, spawnArgs) => {
          calls.push({ command, args: [...spawnArgs] })
          return { status: 0 }
        },
        mkdirSync: () => {},
        writeFileSync: () => {},
        writeStdout: (text) => {
          stdout += text
        },
        writeStderr: (text) => {
          stderr += text
        },
        colorize,
        onResult: (result) => {
          syncResult = result
        },
      })
    },
  }
}

test("runSyncTypesCli skips when marker exists and no refresh is required", () => {
  const env = createFakeEnvironment({
    files: ["/workspace/.b2c-script-types/types/global.d.ts"],
  })

  const exitCode = env.run([])

  expect(exitCode).toBe(0)
  expect(env.calls).toHaveLength(0)
  expect(env.stdout).toContain("Script API types: up to date")
  expect(env.stdout).toContain("Hooks: 0 declarations ->")
  expect(env.result.scriptTypes.refreshed).toBe(false)
})

test("runSyncTypesCli applies semantic output styles through an injected colorizer", () => {
  const env = createFakeEnvironment({
    files: ["/workspace/.b2c-script-types/types/global.d.ts"],
    colorize: (style, text) => `<${style}>${text}</${style}>`,
  })

  const exitCode = env.run([])

  expect(exitCode).toBe(0)
  expect(env.stdout).toContain("Script API types: <green>up to date</green>")
  expect(env.stdout).toContain("Custom APIs: <yellow>no contracts found</yellow>")
  expect(env.stdout).toContain(
    "Hooks: <green>0 declarations</green> -> <dim>.b2c-script-types/types/sfcc-hooks.generated.d.ts</dim>",
  )
})

test("runSyncTypesCli refreshes when minimum version is not met", () => {
  const env = createFakeEnvironment({
    files: [
      "/workspace/.b2c-script-types/types/global.d.ts",
      "/workspace/.b2c-script-types/types/upstream-package.json",
    ],
    metadataVersion: "26.6.0",
  })

  const exitCode = env.run(["--min-version", "26.7.0"])

  expect(exitCode).toBe(0)
  expect(env.calls).toHaveLength(1)
  expect(env.calls[0].command).toBe("pnpm")
  expect(env.calls[0].args).toEqual([
    "b2c",
    "setup",
    "ide",
    "vscode-types",
    "--copy",
    "--force",
    "--output",
    ".b2c-script-types/jsconfig.generated.json",
  ])
  expect(env.result.scriptTypes.refreshed).toBe(true)
})

test("runSyncTypesCli uses local b2c binary when available", () => {
  const env = createFakeEnvironment({
    localBinary: true,
  })

  const exitCode = env.run(["--force"])

  expect(exitCode).toBe(0)
  expect(env.calls).toHaveLength(1)
  expect(env.calls[0].command).toBe("/workspace/node_modules/.bin/b2c")
  expect(env.calls[0].args.slice(0, 3)).toEqual(["setup", "ide", "vscode-types"])
})

test("runSyncTypesCli validates --min-version format", () => {
  const env = createFakeEnvironment()

  const exitCode = env.run(["--min-version", "latest"])

  expect(exitCode).toBe(1)
  expect(env.calls).toHaveLength(0)
  expect(env.stderr).toContain("Invalid --min-version value")
})

test("looksLikeSyncTypesCliEntrypoint returns true for shim and dist entrypoint names", () => {
  expect(looksLikeSyncTypesCliEntrypoint("/tmp/node_modules/.bin/sfcc-ts-sync-types")).toBe(true)
  expect(looksLikeSyncTypesCliEntrypoint("C:/repo/node_modules/.bin/sfcc-ts-sync-types.cmd")).toBe(
    true,
  )
  expect(looksLikeSyncTypesCliEntrypoint("/tmp/pkg/dist/sync-types.cjs")).toBe(true)
  expect(looksLikeSyncTypesCliEntrypoint("/tmp/pkg/dist/sync-types.mjs")).toBe(true)
})

test("looksLikeSyncTypesCliEntrypoint returns false for unrelated executables", () => {
  expect(looksLikeSyncTypesCliEntrypoint("/tmp/node_modules/.bin/vitest")).toBe(false)
  expect(looksLikeSyncTypesCliEntrypoint("/tmp/pkg/dist/typecheck.cjs")).toBe(false)
})
