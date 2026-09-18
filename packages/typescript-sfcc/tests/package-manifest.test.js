import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vite-plus/test"

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const packageManifest = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
)

test("CLI bin targets exist before the package is built", () => {
  expect(packageManifest.files).toContain("bin")

  for (const binTarget of Object.values(packageManifest.bin)) {
    expect(binTarget).toMatch(/^\.\/bin\//u)
    expect(fs.existsSync(path.resolve(packageDirectory, binTarget))).toBe(true)
  }
})

test("typecheck CLI runner is available to command adapters", () => {
  expect(packageManifest.exports["./typecheck-cli"]).toEqual({
    types: "./dist/typecheck-cartridges.d.mts",
    import: "./dist/typecheck-cartridges.mjs",
    require: "./dist/typecheck-cartridges.cjs",
  })
})

test("oclif commands are available to CLI adapters", () => {
  expect(packageManifest.exports["./commands"]).toEqual({
    types: "./dist/commands.d.mts",
    import: "./dist/commands.mjs",
    require: "./dist/commands.cjs",
  })
  expect(packageManifest.dependencies["@oclif/core"]).toMatch(/^\^4\./u)
})

test("supports TypeScript 5.5 through 6", () => {
  expect(packageManifest.peerDependencies.typescript).toBe(">=5.5.0 <7")
})
