import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  CARTRIDGE_ARCHITECTURES,
  defineConfig,
  filterCartridgePathByArchitecture,
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
      `interface Config { cartridgesDir: string; cartridgePath: string[]; architectures: Record<string, string[]>; siteTemplatePath: string; site: string }
      export default {
        cartridgesDir: "commerce/cartridges",
        cartridgePath: ["app_base"],
        architectures: { "storefront-next": ["app_base"] },
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
      architectures: { "storefront-next": ["app_base"] },
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

test("exports the supported cartridge architectures", () => {
  expect(CARTRIDGE_ARCHITECTURES).toEqual([
    "storefront-next",
    "pwa",
    "sfra",
    "sitegenesis-controllers",
    "sitegenesis-pipelines",
  ])
})

test("filters cartridge paths by architecture without changing precedence", () => {
  const cartridgePath = ["app_custom", "int_payment", "modules", "app_base"]
  const assignments = {
    "storefront-next": ["app_custom"],
    sfra: ["app_base"],
  } as const

  expect(
    filterCartridgePathByArchitecture(cartridgePath, assignments, {
      architectures: ["sfra"],
      cartridges: ["modules"],
    }),
  ).toEqual(["modules", "app_base"])

  expect(
    filterCartridgePathByArchitecture(cartridgePath, assignments, {
      architectures: ["storefront-next"],
      includeUnassigned: true,
    }),
  ).toEqual(["app_custom", "int_payment", "modules"])
})

test("rejects ambiguous assignments and unknown selected architectures", () => {
  expect(() =>
    filterCartridgePathByArchitecture(
      ["app_shared"],
      {
        "storefront-next": ["app_shared"],
        sfra: ["app_shared"],
      },
      { architectures: ["sfra"] },
    ),
  ).toThrow(/assigned to both "storefront-next" and "sfra"/u)

  expect(() =>
    filterCartridgePathByArchitecture(["app_legacy"], {}, { architectures: ["legacy"] } as never),
  ).toThrow('Unknown cartridge architecture "legacy".')
})
