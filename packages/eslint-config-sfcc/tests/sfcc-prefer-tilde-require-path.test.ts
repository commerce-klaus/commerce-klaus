import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { expect, test } from "vite-plus/test"

import { recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-tilde-import-"))
  const cartridgesDir = path.join(root, "cartridges")

  for (const cartridgeName of ["app_custom", "app_base"]) {
    fs.mkdirSync(path.join(cartridgesDir, cartridgeName, "cartridge", "scripts"), {
      recursive: true,
    })
  }

  return { root, cartridgesDir }
}

function lint(code: string, root: string, cartridgesDir: string, fix = false) {
  const linter = new Linter({ cwd: root })
  const config = {
    languageOptions: { sourceType: "commonjs" as const },
    plugins: { sfcc },
    settings: {
      sfcc: {
        cartridgesDir,
        cartridgePath: ["app_custom", "app_base"],
      },
    },
    rules: {
      "sfcc/prefer-tilde-require-path": "error" as const,
    },
  }
  const options = { filename: "cartridges/app_custom/cartridge/scripts/example.js" }

  return fix ? linter.verifyAndFix(code, config, options) : linter.verify(code, config, options)
}

test("reports named imports from the current cartridge", () => {
  const { root, cartridgesDir } = createFixture()

  try {
    const messages = lint(
      'const helper = require("app_custom/cartridge/scripts/helper")',
      root,
      cartridgesDir,
    ) as Linter.LintMessage[]

    expect(messages).toHaveLength(1)
    expect(messages[0]?.messageId).toBe("preferTildePath")
    expect(messages[0]?.message).toContain("~/cartridge/scripts/helper")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("fixes the prefix and preserves string delimiters", () => {
  const { root, cartridgesDir } = createFixture()

  try {
    const result = lint(
      [
        "const single = require('app_custom/cartridge/scripts/single')",
        'const double = require("app_custom/cartridge/scripts/double")',
        "const template = require(`app_custom/cartridge/scripts/template`)",
      ].join("\n"),
      root,
      cartridgesDir,
      true,
    ) as Linter.FixReport

    expect(result.fixed).toBe(true)
    expect(result.output).toContain("require('~/cartridge/scripts/single')")
    expect(result.output).toContain('require("~/cartridge/scripts/double")')
    expect(result.output).toContain("require(`~/cartridge/scripts/template`)")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("allows imports from other cartridges and non-named paths", () => {
  const { root, cartridgesDir } = createFixture()

  try {
    const messages = lint(
      `
        const inherited = require("app_base/cartridge/scripts/helper")
        const local = require("~/cartridge/scripts/helper")
        const first = require("*/cartridge/scripts/helper")
        const relative = require("./helper")
        const dynamic = require(moduleName)
        module.exports = { inherited, local, first, relative, dynamic }
      `,
      root,
      cartridgesDir,
    ) as Linter.LintMessage[]

    expect(messages).toHaveLength(0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("is not enabled in the recommended config", () => {
  const ruleIds = recommended.flatMap((config) => Object.keys(config.rules ?? {}))

  expect(ruleIds).not.toContain("sfcc/prefer-tilde-require-path")
})
