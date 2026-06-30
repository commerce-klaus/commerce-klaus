import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vite-plus/test"

import sfccModules from "../src/index.ts"

const testDir = path.dirname(fileURLToPath(import.meta.url))
const basePath = path.resolve(testDir, "cartridges")
const cartridgePath = ["app_brand", "app_core", "app_storefront_base"]
const plugin = sfccModules({ cartridgePath, basePath })

const transformCode = (id) => {
  const code = fs.readFileSync(id, "utf8")
  const transformed = plugin.transform?.(code, id)
  if (!transformed || typeof transformed === "string") {
    return transformed ?? code
  }

  return transformed.code
}

describe("vite-plugin-sfcc-modules", () => {
  it("resolves require('*') with a module in cartridge path behind", () => {
    const resolved = plugin.resolveId?.("*/cartridge/scripts/world")
    expect(resolved).toBe(path.join(basePath, "app_storefront_base/cartridge/scripts/world.js"))
  })

  it("resolves require('*') with a module in cartridge path before", () => {
    const resolved = plugin.resolveId?.("*/cartridge/scripts/welt")
    expect(resolved).toBe(path.join(basePath, "app_brand/cartridge/scripts/welt.js"))
  })

  it("resolves require('*') with a module in the same cartridge", () => {
    const resolved = plugin.resolveId?.("*/cartridge/scripts/monde")
    expect(resolved).toBe(path.join(basePath, "app_core/cartridge/scripts/monde.js"))
  })

  it("resolves require('~') to own cartridge", () => {
    const importer = path.join(basePath, "app_core/cartridge/scripts/petstore.js")
    const resolved = plugin.resolveId?.("~/cartridge/scripts/pet", importer)
    expect(resolved).toBe(path.join(basePath, "app_core/cartridge/scripts/pet.js"))
  })

  it("rewrites module.superModule to static import", () => {
    const id = path.join(basePath, "app_brand/cartridge/scripts/things.js")
    const transformed = transformCode(id)
    expect(transformed).toContain(
      `import __sfcc_superModule__ from ${JSON.stringify(path.join(basePath, "app_core/cartridge/scripts/things.js"))}`,
    )
    expect(transformed).not.toContain("module.superModule")
  })
})
