import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  defineConfig,
  findCommerceKlausConfig,
  loadCommerceKlausConfig,
  resolveCommerceKlausConfig,
} from "../src/index.ts"

function withTempDir(run: (tempDir: string) => void): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "commerce-klaus-config-test-"))

  try {
    run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

test("loads central TypeScript config and applies local overrides", () => {
  withTempDir((tempDir) => {
    const projectDir = path.join(tempDir, "project")
    const nestedDir = path.join(projectDir, "packages", "example")
    const configFile = path.join(projectDir, "commerce-klaus.config.ts")
    fs.mkdirSync(nestedDir, { recursive: true })
    fs.writeFileSync(
      configFile,
      `interface Config { cartridgesDir: string; cartridgePath: string[]; siteTemplatePath: string; site: string }
      export default {
        cartridgesDir: "commerce/cartridges",
        cartridgePath: ["app_base"],
        siteTemplatePath: "metadata",
        site: "RefArch",
      } satisfies Config\n`,
    )

    expect(findCommerceKlausConfig(nestedDir)).toBe(configFile)
    expect(
      resolveCommerceKlausConfig({
        cwd: nestedDir,
        overrides: { cartridgePath: ["app_test", "app_base"], site: undefined },
      }),
    ).toEqual({
      cartridgesDir: path.join(projectDir, "commerce", "cartridges"),
      cartridgePath: ["app_test", "app_base"],
      siteTemplatePath: path.join(projectDir, "metadata"),
      site: "RefArch",
    })
  })
})

test("defineConfig preserves config and config discovery can be disabled", () => {
  const config = defineConfig({ cartridgesDir: "cartridges" })

  expect(config).toEqual({ cartridgesDir: "cartridges" })
  expect(loadCommerceKlausConfig({ configFile: false })).toEqual({ config: {} })
})
