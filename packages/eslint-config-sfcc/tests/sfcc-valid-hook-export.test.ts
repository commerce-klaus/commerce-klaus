import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"

// The recommended config matches files via the relative glob "cartridges/**/*.{js,ds}",
// so tests run inside a temporary cwd with real, relative-path fixture files.
function withTempCartridgesCwd<T>(run: (tempDir: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-valid-hook-export-test-"))
  const previousCwd = process.cwd()
  process.chdir(tempDir)

  try {
    return run(tempDir)
  } finally {
    process.chdir(previousCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeJson(filePath: string, content: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

function lint(code: string, filename: string) {
  const linter = new Linter()
  return linter.verify(code, recommended, { filename })
}

test("reports a missing static CommonJS export for a registered dw.* hook", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/hooks/basket.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)

    writeJson(path.join(tempDir, "cartridges", "app_custom", "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(
      path.join(tempDir, "cartridges", "app_custom", "cartridge", "scripts", "hooks.json"),
      { hooks: [{ name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" }] },
    )
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, "exports.afterPATCH = function () {}\n")

    const messages = lint("exports.afterPATCH = function () {}\n", relativeScriptPath)
    const hits = messages.filter((message) => message.ruleId === "sfcc/valid-hook-export")

    expect(hits).toHaveLength(1)
    expect(hits[0]?.message).toContain('"dw.ocapi.shop.basket.afterPOST"')
    expect(hits[0]?.message).toContain('"afterPOST"')
  })
})

test("allows exports.method assignment", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/hooks/basket.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)

    writeJson(path.join(tempDir, "cartridges", "app_custom", "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(
      path.join(tempDir, "cartridges", "app_custom", "cartridge", "scripts", "hooks.json"),
      { hooks: [{ name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" }] },
    )
    const code = "exports.afterPOST = function () {}\n"
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-hook-export")).toBe(false)
  })
})

test("allows module.exports object literal export", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/hooks/basket.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)

    writeJson(path.join(tempDir, "cartridges", "app_custom", "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(
      path.join(tempDir, "cartridges", "app_custom", "cartridge", "scripts", "hooks.json"),
      { hooks: [{ name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" }] },
    )
    const code = "module.exports = { afterPOST: function () {} }\n"
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-hook-export")).toBe(false)
  })
})

test("does not infer an export name for project-specific hook registrations", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/hooks/provider.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)

    writeJson(path.join(tempDir, "cartridges", "app_custom", "package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(
      path.join(tempDir, "cartridges", "app_custom", "cartridge", "scripts", "hooks.json"),
      { hooks: [{ name: "app.example.hook.Provider", script: "./hooks/provider" }] },
    )
    const code = "exports.getStores = function () {}\n"
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-hook-export")).toBe(false)
  })
})

test("ignores files not registered in any hooks.json", () => {
  withTempCartridgesCwd((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/helper.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    const code = "module.exports = {}\n"
    fs.writeFileSync(scriptPath, code)

    const messages = lint(code, relativeScriptPath)
    expect(messages.some((message) => message.ruleId === "sfcc/valid-hook-export")).toBe(false)
  })
})
