import { expect, test } from "vite-plus/test"

import { looksLikeSyncTypesCliEntrypoint, runSyncTypesCli } from "../src/sync-types.ts"

function createFakeEnvironment({ files = [], metadataVersion, localBinary = false } = {}) {
  const fileSet = new Set(files)
  const calls = []
  let stdout = ""
  let stderr = ""

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
        writeStdout: (text) => {
          stdout += text
        },
        writeStderr: (text) => {
          stderr += text
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
  expect(env.stdout).toContain("skipping sync")
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
