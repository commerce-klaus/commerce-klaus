import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { configs } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function withTempCartridge<T>(run: (tempDir: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-no-hooks-test-"))
  const previousCwd = process.cwd()
  process.chdir(tempDir)

  try {
    return run(tempDir)
  } finally {
    process.chdir(previousCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function writeJson(filePath: string, content: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

function lint(code: string, filename: string) {
  return new Linter().verify(
    code,
    {
      plugins: { sfcc },
      rules: { "sfcc/no-hooks": "error" },
    },
    { filename },
  )
}

test("reports platform and project hook registrations", () => {
  withTempCartridge((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/provider.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)
    const code = "module.exports = {}\n"

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, code)
    writeJson(path.join(tempDir, "cartridges/app_custom/package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(path.join(tempDir, "cartridges/app_custom/cartridge/scripts/hooks.json"), {
      hooks: [
        { name: "dw.order.calculate", script: "./provider" },
        { name: "app.example.Provider", script: "./provider" },
      ],
    })

    const messages = lint(code, relativeScriptPath)

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain("dw.order.calculate")
    expect(messages[0]?.message).toContain("app.example.Provider")
  })
})

test("allows an unregistered file in a hooks directory", () => {
  withTempCartridge((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/hooks/helper.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)
    const code = "module.exports = {}\n"

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, code)
    writeJson(path.join(tempDir, "cartridges/app_custom/package.json"), {
      hooks: "./cartridge/scripts/hooks.json",
    })
    writeJson(path.join(tempDir, "cartridges/app_custom/cartridge/scripts/hooks.json"), {
      hooks: [{ name: "dw.order.calculate", script: "./calculate" }],
    })

    expect(lint(code, relativeScriptPath)).toHaveLength(0)
  })
})

test("allows files in cartridges without a hooks declaration", () => {
  withTempCartridge((tempDir) => {
    const relativeScriptPath = "cartridges/app_custom/cartridge/scripts/provider.js"
    const scriptPath = path.join(tempDir, relativeScriptPath)
    const code = "module.exports = {}\n"

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, code)
    writeJson(path.join(tempDir, "cartridges/app_custom/package.json"), {})

    expect(lint(code, relativeScriptPath)).toHaveLength(0)
  })
})

test("is not enabled in recommended or storefront presets", () => {
  const ruleIds = Object.values(configs).flatMap((preset) =>
    preset.flatMap((presetConfig) => Object.keys(presetConfig.rules ?? {})),
  )

  expect(ruleIds).not.toContain("sfcc/no-hooks")
})
