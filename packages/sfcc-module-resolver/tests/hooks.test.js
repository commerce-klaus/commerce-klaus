import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import {
  findCartridgeRootForFile,
  getCartridgeHooksJsonPath,
  getHookRegistrationsFromDocument,
  getRequiredHookExportName,
  getRequiredHookExportsForScriptFile,
  resolveHookScriptPath,
} from "../src/index.ts"

function withTempDir(run) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-module-resolver-hooks-test-"))

  try {
    return run(tempDir)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeJson(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

test("findCartridgeRootForFile locates the directory directly under cartridges", () => {
  withTempDir((tempDir) => {
    const cartridgeRoot = path.join(tempDir, "cartridges", "app_custom")
    const scriptPath = path.join(cartridgeRoot, "cartridge", "scripts", "hooks", "basket.js")

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, "exports.afterPOST = function () {}\n")

    expect(findCartridgeRootForFile(scriptPath)).toBe(cartridgeRoot)
  })
})

test("findCartridgeRootForFile returns undefined outside a cartridges directory", () => {
  withTempDir((tempDir) => {
    const scriptPath = path.join(tempDir, "scripts", "basket.js")
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, "")

    expect(findCartridgeRootForFile(scriptPath)).toBeUndefined()
  })
})

test("getHookRegistrationsFromDocument validates hook entries", () => {
  expect(
    getHookRegistrationsFromDocument({
      hooks: [{ name: "dw.order.calculate", script: "./calculate" }],
    }),
  ).toEqual([{ name: "dw.order.calculate", script: "./calculate" }])

  expect(getHookRegistrationsFromDocument({ hooks: [{ name: "" }] })).toBeUndefined()
  expect(getHookRegistrationsFromDocument({})).toBeUndefined()
  expect(getHookRegistrationsFromDocument(null)).toBeUndefined()
})

test("resolveHookScriptPath appends known extensions", () => {
  withTempDir((tempDir) => {
    const scriptPath = path.join(tempDir, "hooks", "basket.js")
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, "")

    expect(resolveHookScriptPath(tempDir, "./hooks/basket")).toBe(scriptPath)
    expect(resolveHookScriptPath(tempDir, "./hooks/missing")).toBeUndefined()
  })
})

test("getRequiredHookExportName only infers names for dw.* hooks", () => {
  expect(getRequiredHookExportName("dw.order.calculate")).toBe("calculate")
  expect(getRequiredHookExportName("app.example.hook.Provider")).toBeUndefined()
})

test("getCartridgeHooksJsonPath resolves the declared hooks path", () => {
  withTempDir((tempDir) => {
    const cartridgeRoot = path.join(tempDir, "cartridges", "app_custom")
    const hooksPath = path.join(cartridgeRoot, "cartridge", "scripts", "hooks.json")

    writeJson(path.join(cartridgeRoot, "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })

    expect(getCartridgeHooksJsonPath(cartridgeRoot)).toBe(hooksPath)
  })
})

test("getCartridgeHooksJsonPath returns undefined without a hooks declaration", () => {
  withTempDir((tempDir) => {
    const cartridgeRoot = path.join(tempDir, "cartridges", "app_custom")
    writeJson(path.join(cartridgeRoot, "package.json"), {})

    expect(getCartridgeHooksJsonPath(cartridgeRoot)).toBeUndefined()
  })
})

test("getRequiredHookExportsForScriptFile returns required exports for a registered script", () => {
  withTempDir((tempDir) => {
    const cartridgeRoot = path.join(tempDir, "cartridges", "app_custom")
    const scriptPath = path.join(cartridgeRoot, "cartridge", "scripts", "hooks", "basket.js")

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, "exports.afterPOST = function () {}\n")
    writeJson(path.join(cartridgeRoot, "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(path.join(cartridgeRoot, "cartridge", "scripts", "hooks.json"), {
      hooks: [
        { name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" },
        { name: "app.example.hook.Provider", script: "./hooks/basket" },
      ],
    })

    expect(getRequiredHookExportsForScriptFile(scriptPath)).toEqual([
      { hookName: "dw.ocapi.shop.basket.afterPOST", exportName: "afterPOST" },
    ])
  })
})

test("getRequiredHookExportsForScriptFile returns an empty list for unrelated files", () => {
  withTempDir((tempDir) => {
    const cartridgeRoot = path.join(tempDir, "cartridges", "app_custom")
    const scriptPath = path.join(cartridgeRoot, "cartridge", "scripts", "helper.js")

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, "module.exports = {}\n")
    writeJson(path.join(cartridgeRoot, "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(path.join(cartridgeRoot, "cartridge", "scripts", "hooks.json"), {
      hooks: [{ name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" }],
    })

    expect(getRequiredHookExportsForScriptFile(scriptPath)).toEqual([])
  })
})
