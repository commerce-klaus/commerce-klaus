import tsParser from "@typescript-eslint/parser"
import { ESLint } from "eslint"
import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vite-plus/test"

import { createRecommendedConfig, recommended } from "../src/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

function lint(code: string, filename = "cartridges/app_sfra/cartridge/controllers/Home.js") {
  const linter = new Linter()
  return linter.verify(code, recommended, { filename })
}

const typeAwareFixtureDir = fileURLToPath(
  new URL("./fixtures/valid-require-path-type-aware", import.meta.url),
)

async function lintTypeAwareFixture(filename: string) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.js"],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            project: [path.join(typeAwareFixtureDir, "tsconfig.json")],
          },
        },
        plugins: {
          sfcc,
        },
        rules: {
          "sfcc/valid-require-path": "error",
        },
      },
    ],
  })

  const results = await eslint.lintFiles([path.join(typeAwareFixtureDir, filename)])
  return results[0]?.messages ?? []
}

function createTempTestRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-test-root-"))
}

test("allows dw requires", () => {
  const messages = lint(`
    const OrderMgr = require("dw/order/OrderMgr")
    module.exports = OrderMgr
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("allows cartridge-style requires", () => {
  const messages = lint(`
    const helper = require("app_storefront/cartridge/scripts/helper")
    module.exports = helper
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("allows relative requires", () => {
  const messages = lint(`
    const one = require("./test")
    const two = require("../test")
    module.exports = { one, two }
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("allows SFCC star and tilde requires", () => {
  const messages = lint(`
    const one = require("*/cartridge/scripts/middleware/csrf")
    const two = require("~/cartridge/scripts/middleware/auth")
    module.exports = { one, two }
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("allows configured default bare module server", () => {
  const messages = lint(`
    const server = require("server")
    module.exports = server
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("reports invalid bare module requires", () => {
  const messages = lint(`
    const lodash = require("lodash")
    module.exports = lodash
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("allows dynamic import with valid dw path", () => {
  const messages = lint(`
    async function load() {
      return import("dw/order/OrderMgr")
    }

    module.exports = load
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("reports invalid bare module dynamic imports", () => {
  const messages = lint(`
    async function load() {
      return import("lodash")
    }

    module.exports = load
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("ignores dynamic requires", () => {
  const messages = lint(`
    const moduleName = "dw/order/OrderMgr"
    const dynamic = require(moduleName)
    module.exports = dynamic
  `)

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("uses type info for indirect const string and reports invalid module", async () => {
  const messages = await lintTypeAwareFixture("invalid-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("uses type info for union of valid string literals and allows both", async () => {
  const messages = await lintTypeAwareFixture("valid-union-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("uses type info for union with invalid string literal and reports it", async () => {
  const messages = await lintTypeAwareFixture("invalid-union-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("uses type info for alias-based union with invalid string literal and reports it", async () => {
  const messages = await lintTypeAwareFixture("invalid-union-alias-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("uses type info for union of invalid string literals and reports candidates", async () => {
  const messages = await lintTypeAwareFixture("invalid-all-literals-union-indirect.js")
  const hits = messages.filter((m) => m.ruleId === "sfcc/valid-require-path")

  expect(hits.length).toBeGreaterThanOrEqual(1)
  expect(hits.some((m) => m.message.includes("lodash") || m.message.includes("chalk"))).toBe(true)
})

test("uses type info for indirect const string and allows valid dw path", async () => {
  const messages = await lintTypeAwareFixture("valid-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("uses type info for indirect const template literal and allows valid dw path", async () => {
  const messages = await lintTypeAwareFixture("valid-template-literal-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("uses type info for indirect const template literal and reports invalid module", async () => {
  const messages = await lintTypeAwareFixture("invalid-template-literal-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("uses type info for indirect dynamic import and reports invalid module", async () => {
  const messages = await lintTypeAwareFixture("invalid-import-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(true)
})

test("keeps fallback behavior for non-literal typed identifiers", async () => {
  const messages = await lintTypeAwareFixture("nonliteral-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("keeps fallback behavior for mixed union with non-literal member", async () => {
  const messages = await lintTypeAwareFixture("mixed-union-nonliteral-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("keeps fallback behavior for alias-based mixed union with non-literal member", async () => {
  const messages = await lintTypeAwareFixture("mixed-union-nonliteral-alias-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("keeps fallback behavior for alias-based mixed union in dynamic import", async () => {
  const messages = await lintTypeAwareFixture("mixed-import-nonliteral-alias-indirect.js")

  expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
})

test("supports checkCartridgeExists option", () => {
  const tempRoot = createTempTestRoot()
  const tempCartridgesDir = path.join(tempRoot, "cartridges")
  const ownCartridgeName = "app_sfra"
  const existingCartridgeName = "app_storefront"
  const existingCartridge = path.join(tempCartridgesDir, existingCartridgeName)
  const ownCartridge = path.join(tempCartridgesDir, ownCartridgeName)
  const filename = "cartridges/app_sfra/cartridge/controllers/Home.js"

  fs.mkdirSync(path.join(existingCartridge, "cartridge", "scripts"), { recursive: true })
  fs.mkdirSync(path.join(ownCartridge, "cartridge", "scripts"), { recursive: true })
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(
    path.join(existingCartridge, "cartridge", "scripts", "ok.js"),
    "module.exports = true",
  )
  fs.writeFileSync(
    path.join(ownCartridge, "cartridge", "scripts", "local.js"),
    "module.exports = true",
  )

  try {
    const linter = new Linter()
    const config = createRecommendedConfig({
      sfcc: {
        checkCartridgeExists: true,
        cartridgesDir: tempCartridgesDir,
      },
    })

    const messages = linter.verify(
      `
        const ok = require("${existingCartridgeName}/cartridge/scripts/ok")
        const okStar = require("*/cartridge/scripts/ok")
        const bad = require("missing_cartridge/cartridge/scripts/bad")
        const badStar = require("*/cartridge/scripts/does-not-exist")
        module.exports = { ok, okStar, bad, badStar }
      `,
      config,
      { filename },
    )

    const hits = messages.filter((m) => m.ruleId === "sfcc/valid-require-path")
    expect(hits).toHaveLength(2)
    expect(hits[0]?.message.includes("missing_cartridge")).toBe(true)
    expect(hits.some((m) => m.message.includes("*/cartridge/scripts/does-not-exist"))).toBe(true)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("checks whether module.superModule resolves in cartridge order", () => {
  const tempRoot = fs.mkdtempSync(path.join(process.cwd(), ".sfcc-test-root-"))
  const tempCartridgesDir = path.join(tempRoot, "cartridges")
  const customCartridge = path.join(tempCartridgesDir, "app_custom")
  const baseCartridge = path.join(tempCartridgesDir, "app_base")
  const customController = path.join(customCartridge, "cartridge", "controllers", "Page.js")
  const baseController = path.join(baseCartridge, "cartridge", "controllers", "Page.js")
  const missingController = path.join(customCartridge, "cartridge", "controllers", "Missing.js")

  fs.mkdirSync(path.dirname(customController), { recursive: true })
  fs.mkdirSync(path.dirname(baseController), { recursive: true })
  fs.writeFileSync(customController, "module.exports = module.superModule\n")
  fs.writeFileSync(baseController, "module.exports = {}\n")
  fs.writeFileSync(missingController, "module.exports = module.superModule\n")

  try {
    const linter = new Linter()
    const config = createRecommendedConfig({
      files: ["**/*.js"],
      ignores: [],
      sfcc: {
        checkCartridgeExists: true,
        cartridgesDir: tempCartridgesDir,
        cartridgePath: ["app_custom", "app_base"],
      },
    })

    const validMessages = linter.verify("module.exports = module.superModule", config, {
      filename: path.relative(process.cwd(), customController),
    })
    const invalidMessages = linter.verify("module.exports = module.superModule", config, {
      filename: path.relative(process.cwd(), missingController),
    })

    expect(validMessages.some((message) => message.messageId === "unresolvedSuperModule")).toBe(
      false,
    )
    expect(invalidMessages.some((message) => message.messageId === "unresolvedSuperModule")).toBe(
      true,
    )
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("supports cartridge order from site template", () => {
  const tempRoot = createTempTestRoot()
  const tempCartridgesDir = path.join(tempRoot, "cartridges")
  const cartridgeName = "app_storefront"
  const ownCartridgeName = "app_sfra"
  const targetCartridge = path.join(tempCartridgesDir, cartridgeName)
  const ownCartridge = path.join(tempCartridgesDir, ownCartridgeName)
  const siteTemplatePath = path.join(tempRoot, "site_template")
  const site = "example"
  const siteTemplateXmlPath = path.join(siteTemplatePath, "sites", site, "site.xml")
  const filename = "cartridges/app_sfra/cartridge/controllers/Home.js"

  fs.mkdirSync(path.join(targetCartridge, "cartridge", "scripts"), { recursive: true })
  fs.mkdirSync(path.join(ownCartridge, "cartridge", "scripts"), { recursive: true })
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.mkdirSync(path.dirname(siteTemplateXmlPath), { recursive: true })
  fs.writeFileSync(
    path.join(targetCartridge, "cartridge", "scripts", "ok.js"),
    "module.exports = true",
  )
  try {
    fs.writeFileSync(
      siteTemplateXmlPath,
      `<site><custom-cartridges>app_base:${cartridgeName}:int_payments</custom-cartridges></site>`,
    )

    const linter = new Linter()
    const config = createRecommendedConfig({
      sfcc: {
        checkCartridgeExists: true,
        cartridgesDir: tempCartridgesDir,
        siteTemplatePath,
        site,
      },
    })

    const messages = linter.verify(
      `
        const okStar = require("*/cartridge/scripts/ok")
        module.exports = { okStar }
      `,
      config,
      { filename },
    )

    expect(messages.some((m) => m.ruleId === "sfcc/valid-require-path")).toBe(false)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("rejects direct rule options and requires shared settings", () => {
  const linter = new Linter()

  const config: Linter.Config[] = [
    {
      ...recommended[0],
      rules: {
        ...recommended[0]?.rules,
        "sfcc/valid-require-path": ["error", { checkCartridgeExists: true }],
      },
    },
  ]

  expect(() =>
    linter.verify('const x = require("server"); module.exports = x', config, {
      filename: "cartridges/app_sfra/cartridge/controllers/Home.js",
    }),
  ).toThrow()
})

test("requires and fixes extensions for resolvable SFCC module paths", () => {
  const tempRoot = fs.mkdtempSync(path.join(process.cwd(), ".sfcc-extension-test-root-"))
  const cartridgesDir = path.join(tempRoot, "cartridges")
  const customCartridge = path.join(cartridgesDir, "app_custom")
  const baseCartridge = path.join(cartridgesDir, "app_base")
  const controller = path.join(customCartridge, "cartridge", "controllers", "Home.js")

  fs.mkdirSync(path.dirname(controller), { recursive: true })
  fs.mkdirSync(path.join(customCartridge, "cartridge", "scripts"), { recursive: true })
  fs.mkdirSync(path.join(baseCartridge, "cartridge", "scripts"), { recursive: true })
  fs.writeFileSync(controller, "module.exports = {}\n")
  fs.writeFileSync(
    path.join(customCartridge, "cartridge", "scripts", "local.js"),
    "module.exports = true\n",
  )
  fs.writeFileSync(path.join(baseCartridge, "cartridge", "scripts", "shared.json"), "{}\n")
  fs.writeFileSync(
    path.join(customCartridge, "cartridge", "controllers", "relative.ds"),
    "module.exports = true\n",
  )

  try {
    const linter = new Linter()
    const config: Linter.Config = {
      plugins: { sfcc },
      settings: {
        sfcc: {
          cartridgesDir,
          cartridgePath: ["app_custom", "app_base"],
        },
      },
      rules: { "sfcc/require-file-extension": "error" },
    }
    const result = linter.verifyAndFix(
      `
        const local = require("~/cartridge/scripts/local")
        const shared = require("*/cartridge/scripts/shared")
        const named = require("app_base/cartridge/scripts/shared")
        const relative = require("./relative")
        module.exports = { local, shared, named, relative }
      `,
      config,
      { filename: controller },
    )

    expect(result.fixed).toBe(true)
    expect(result.messages).toHaveLength(0)
    expect(result.output).toContain('require("~/cartridge/scripts/local.js")')
    expect(result.output).toContain('require("*/cartridge/scripts/shared.json")')
    expect(result.output).toContain('require("app_base/cartridge/scripts/shared.json")')
    expect(result.output).toContain('require("./relative.ds")')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("reports missing extensions without unsafe fixes", () => {
  const tempRoot = fs.mkdtempSync(path.join(process.cwd(), ".sfcc-extension-test-root-"))
  const cartridgesDir = path.join(tempRoot, "cartridges")
  const cartridge = path.join(cartridgesDir, "app_custom")
  const controller = path.join(cartridge, "cartridge", "controllers", "Home.js")

  fs.mkdirSync(path.join(cartridge, "cartridge", "scripts", "directory"), {
    recursive: true,
  })
  fs.mkdirSync(path.dirname(controller), { recursive: true })
  fs.writeFileSync(
    path.join(cartridge, "cartridge", "scripts", "directory", "index.js"),
    "module.exports = true\n",
  )

  try {
    const linter = new Linter()
    const config: Linter.Config = {
      plugins: { sfcc },
      settings: { sfcc: { cartridgesDir, cartridgePath: ["app_custom"] } },
      rules: { "sfcc/require-file-extension": "error" },
    }
    const code = `
      const directory = require("~/cartridge/scripts/directory")
      const missing = require("~/cartridge/scripts/missing")
      module.exports = { directory, missing }
    `
    const result = linter.verifyAndFix(code, config, { filename: controller })

    expect(result.fixed).toBe(false)
    expect(result.output).toBe(code)
    expect(
      result.messages.filter((message) => message.messageId === "missingExtension"),
    ).toHaveLength(2)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("ignores platform, bare, dynamic, and already explicit module paths", () => {
  const linter = new Linter()
  const messages = linter.verify(
    `
      const api = require("dw/order/OrderMgr")
      const server = require("server")
      const explicit = require("./helper.js")
      const dynamic = require(moduleName)
      module.exports = { api, server, explicit, dynamic }
    `,
    {
      plugins: { sfcc },
      rules: { "sfcc/require-file-extension": "error" },
    },
    { filename: "cartridges/app_custom/cartridge/scripts/example.js" },
  )

  expect(messages).toHaveLength(0)
})
