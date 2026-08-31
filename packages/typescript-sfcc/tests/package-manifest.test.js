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
