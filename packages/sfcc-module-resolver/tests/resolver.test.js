import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  SUPER_MODULE_TOKEN,
  createSfccModuleResolver,
  getSiteTemplateCartridgePath,
  inferCartridgeOrder,
  transformSuperModuleSource,
} from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-module-resolver-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

test("inferCartridgeOrder uses configured cartridgePath before other sources", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const appCore = path.join(cartridgesDir, "app_core")
    const appBase = path.join(cartridgesDir, "app_storefront_base")

    fs.mkdirSync(appCore, { recursive: true })
    fs.mkdirSync(appBase, { recursive: true })

    const result = inferCartridgeOrder({
      cartridgesDir,
      cartridgePath: ["app_storefront_base", "app_core", "missing"],
      envCartridgePath: "app_core",
    })

    expect(result).toEqual([appBase, appCore])
  })
})

test("inferCartridgeOrder falls back to site template", () => {
  withTempDir((tempDir) => {
    const cartridgesDir = path.join(tempDir, "cartridges")
    const siteTemplatePath = path.join(tempDir, "site_template")
    const siteXmlPath = path.join(siteTemplatePath, "sites", "RefArch", "site.xml")

    fs.mkdirSync(path.join(cartridgesDir, "app_storefront_base"), { recursive: true })
    fs.mkdirSync(path.join(cartridgesDir, "app_core"), { recursive: true })
    fs.mkdirSync(path.dirname(siteXmlPath), { recursive: true })
    fs.writeFileSync(
      siteXmlPath,
      "<site><custom-cartridges>app_core:missing:app_storefront_base</custom-cartridges></site>",
    )

    const result = inferCartridgeOrder({
      cartridgesDir,
      siteTemplatePath,
      site: "RefArch",
    })

    expect(result.map((entry) => path.basename(entry))).toEqual(["app_core", "app_storefront_base"])
  })
})

test("getSiteTemplateCartridgePath parses nested custom-cartridges", () => {
  withTempDir((tempDir) => {
    const siteTemplatePath = path.join(tempDir, "site_template")
    const siteXmlPath = path.join(siteTemplatePath, "sites", "RefArch", "site.xml")

    fs.mkdirSync(path.dirname(siteXmlPath), { recursive: true })
    fs.writeFileSync(
      siteXmlPath,
      "<site><settings><custom-cartridges>app_a:app_b</custom-cartridges></settings></site>",
    )

    const result = getSiteTemplateCartridgePath(siteTemplatePath, "RefArch", tempDir)
    expect(result).toEqual(["app_a", "app_b"])
  })
})

test("createSfccModuleResolver resolves ~/, */ and cartridge aliases", () => {
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
