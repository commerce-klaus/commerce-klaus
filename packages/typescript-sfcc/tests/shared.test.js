import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  SUPER_MODULE_TOKEN,
  createSfccModuleResolver,
  createSfccPaths,
  inferCartridgeOrder,
  transformSuperModuleSource,
} from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-ts-tooling-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

test("inferCartridgeOrder uses SFCC_CARTRIDGE_PATH order and skips missing entries", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appStorefront = path.join(cartridgesDir, "app_storefront_base")
    const appCore = path.join(cartridgesDir, "app_core")

    fs.mkdirSync(appStorefront, { recursive: true })
    fs.mkdirSync(appCore, { recursive: true })

    const previousPath = process.env.SFCC_CARTRIDGE_PATH
    process.env.SFCC_CARTRIDGE_PATH = "app_storefront_base:missing:app_core"

    try {
      const result = inferCartridgeOrder(cartridgesDir)

      expect(result).toEqual([appStorefront, appCore])
    } finally {
      if (previousPath === undefined) {
        delete process.env.SFCC_CARTRIDGE_PATH
      } else {
        process.env.SFCC_CARTRIDGE_PATH = previousPath
      }
    }
  })
})

test("createSfccPaths creates aliases for cartridges plus server and bc_napali mappings", () => {
  const configPath = "/workspace/cartridges/jsconfig.json"
  const cartridgeRoots = [
    "/workspace/cartridges/app_storefront_base",
    "/workspace/cartridges/modules",
    "/workspace/cartridges/int_napali",
  ]

  const paths = createSfccPaths(configPath, cartridgeRoots)

  expect(paths["dw/*"]).toEqual(["../.b2c-script-types/types/dw/*"])
  expect(paths["app_storefront_base/*"]).toEqual(["app_storefront_base/*"])
  expect(paths["modules/*"]).toEqual(["modules/*"])
  expect(paths.server).toEqual(["modules/server"])
  expect(paths["server/*"]).toEqual(["modules/server/*"])
  expect(paths["bc_napali/*"]).toEqual(["int_napali/*"])
})

test("createSfccPaths resolves dw mapping for per-cartridge configs", () => {
  const configPath = "/workspace/cartridges/app_custom/jsconfig.json"
  const cartridgeRoots = ["/workspace/cartridges/app_custom"]

  const paths = createSfccPaths(configPath, cartridgeRoots)

  expect(paths["dw/*"]).toEqual(["../../.b2c-script-types/types/dw/*"])
})

test("createSfccModuleResolver resolves ~/, */ and cartridge alias imports", () => {
  withTempDir((tempDir) => {
    const appCore = path.join(tempDir, "app_core")
    const appBrand = path.join(tempDir, "app_brand")
    const sourceFile = path.join(appCore, "cartridge", "controllers", "Home.js")

    fs.mkdirSync(path.dirname(sourceFile), { recursive: true })
    fs.writeFileSync(sourceFile, "module.exports = {}\n")

    const localScript = path.join(appCore, "cartridge", "scripts", "helper.js")
    fs.mkdirSync(path.dirname(localScript), { recursive: true })
    fs.writeFileSync(localScript, "module.exports = {}\n")

    const brandModel = path.join(appBrand, "cartridge", "models", "brand.js")
    fs.mkdirSync(path.dirname(brandModel), { recursive: true })
    fs.writeFileSync(brandModel, "module.exports = {}\n")

    const coreModel = path.join(appCore, "cartridge", "models", "core.js")
    fs.mkdirSync(path.dirname(coreModel), { recursive: true })
    fs.writeFileSync(coreModel, "module.exports = {}\n")

    const resolveSfccModule = createSfccModuleResolver([appCore, appBrand])

    expect(resolveSfccModule("~/cartridge/scripts/helper", sourceFile)).toBe(localScript)
    expect(resolveSfccModule("*/cartridge/models/core", sourceFile)).toBe(coreModel)
    expect(resolveSfccModule("app_brand/cartridge/models/brand", sourceFile)).toBe(brandModel)
  })
})

test("transformSuperModuleSource injects require and rewrites module.superModule", () => {
  withTempDir((tempDir) => {
    const appCustom = path.join(tempDir, "app_custom")
    const appBase = path.join(tempDir, "app_base")
    const customController = path.join(appCustom, "cartridge", "controllers", "Page.js")
    const baseController = path.join(appBase, "cartridge", "controllers", "Page.js")

    fs.mkdirSync(path.dirname(customController), { recursive: true })
    fs.mkdirSync(path.dirname(baseController), { recursive: true })
    fs.writeFileSync(baseController, "module.exports = {}\n")

    const source = '"use strict"\nconst parent = module.superModule\nmodule.exports = parent\n'
    const transformed = transformSuperModuleSource(source, customController, [appCustom, appBase])

    expect(transformed).toContain(
      `const ${SUPER_MODULE_TOKEN} = require("app_base/cartridge/controllers/Page");`,
    )
    expect(transformed).toContain(`const parent = ${SUPER_MODULE_TOKEN}`)
    expect(transformed.startsWith('"use strict"\n')).toBe(true)
  })
})

test("transformSuperModuleSource replaces module.superModule with undefined if no fallback cartridge exists", () => {
  const source = "const parent = module.superModule\n"
  const transformed = transformSuperModuleSource(
    source,
    "/tmp/app_custom/cartridge/controllers/Page.js",
    ["/tmp/app_custom"],
  )

  expect(transformed).toBe("const parent = undefined\n")
})
