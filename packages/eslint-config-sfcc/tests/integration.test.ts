import { ESLint } from "eslint"
import pluginESx from "eslint-plugin-es-x"
import globals from "globals"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { beforeAll, expect, test, describe } from "vite-plus/test"

import { createEslintAfterOxlintConfig } from "../src/configs/eslint-after-oxlint.js"
import { createRecommendedConfig } from "../src/configs/recommended.js"
import sfcc from "../src/plugins/sfcc/index.js"
import sitegenesis from "../src/plugins/sitegenesis/index.js"
import esOverrides from "../src/rules/es.js"
import rules from "../src/rules/index.js"

async function lint(
  code: string,
  filename = "cartridges/app_sfra/cartridge/scripts/fixture.js",
): Promise<any[]> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: createRecommendedConfig(),
  })
  const results = await eslint.lintText(code, { filePath: filename })
  return results[0]?.messages || []
}

async function lintModule(code: string): Promise<any[]> {
  const moduleConfig = [
    {
      files: ["**/*.js"],
      languageOptions: {
        sourceType: "module" as const,
        globals: globals.commonjs,
      },
      plugins: {
        "es-x": pluginESx,
        sfcc,
        sitegenesis,
      },
      rules,
    },
  ]
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: moduleConfig,
  })
  const results = await eslint.lintText(code, { filePath: "test.js" })
  return results[0]?.messages || []
}

function hasErrors(messages: any[]): boolean {
  return messages.filter((m) => m.severity > 0).length > 0
}

async function lintAfterOxlint(
  code: string,
  filename = "cartridges/app_sfra/cartridge/scripts/fixture.js",
): Promise<any[]> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: createEslintAfterOxlintConfig({
      files: ["**/*.{js,ds}"],
      ignores: [],
    }),
  })
  const results = await eslint.lintText(code, { filePath: filename })
  return results[0]?.messages || []
}

const packageRoot = path.resolve(import.meta.dirname, "..")
const workspaceRoot = path.resolve(packageRoot, "../..")
const vitePlus = path.join(workspaceRoot, "node_modules/.bin/vp")
const oxlint = path.join(packageRoot, "node_modules/.bin/oxlint")
const INTEGRATION_TEST_TIMEOUT = 30_000

function lintWithOxlint(
  code: string,
  relativeFilePath = "sample.js",
  setup?: (temporaryDir: string) => void,
  expectedStatus = 1,
): string {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "commerce-klaus-oxlint-"))

  try {
    const configFile = path.join(temporaryDir, "oxlint.config.mjs")
    const sampleFile = path.join(temporaryDir, relativeFilePath)
    const packageLink = path.join(temporaryDir, "node_modules/@commerce-klaus/eslint-config-sfcc")

    fs.mkdirSync(path.dirname(packageLink), { recursive: true })
    fs.symlinkSync(packageRoot, packageLink, "junction")
    fs.writeFileSync(
      configFile,
      'import config from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"\nexport default config\n',
    )
    fs.mkdirSync(path.dirname(sampleFile), { recursive: true })
    fs.writeFileSync(sampleFile, code)
    setup?.(temporaryDir)

    const result = spawnSync(oxlint, ["--config", configFile, sampleFile], {
      cwd: packageRoot,
      encoding: "utf8",
    })

    expect(result.status).toBe(expectedStatus)
    return `${result.stdout}${result.stderr}`
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true })
  }
}

describe("ESLint and Oxlint rule compatibility", () => {
  beforeAll(() => {
    execFileSync(vitePlus, ["pack"], { cwd: packageRoot })
  }, INTEGRATION_TEST_TIMEOUT)

  test.each([
    ["no-ambiguous-empty", "empty(customer)\n", "sfcc(no-ambiguous-empty)", 1, 0],
    [
      "no-rhino-import-globals",
      'importScript("legacy.js")\n',
      "sfcc(no-rhino-import-globals)",
      2,
      1,
    ],
    ["no-string-equals", 'name.equals("customer")\n', "sfcc(no-string-equals)", 2, 1],
    [
      "prefer-const",
      "function route() { let value = 1; return value }\n",
      "sfcc(prefer-const)",
      2,
      1,
    ],
    [
      "prefer-explicit-empty-check",
      "/** @param {string} value */\nfunction check(value) { return empty(value) }\n",
      "sfcc(prefer-explicit-empty-check)",
      1,
      0,
    ],
    [
      "rhino-const-compat",
      "for (let index = 0; index < 1; index += 1) { const value = index }\n",
      "sfcc(rhino-const-compat)",
      2,
      1,
    ],
    [
      "rhino-const-conflict",
      "function route() { if (first) { const value = 1 } if (second) { const value = 2 } }\n",
      "sfcc(rhino-const-conflict)",
      2,
      1,
    ],
    ["valid-require-path", 'require("unsupported")\n', "sfcc(valid-require-path)", 2, 1],
  ])(
    "runs %s",
    async (
      _ruleName,
      code,
      oxlintRuleId,
      expectedEslintSeverity,
      expectedOxlintStatus,
      relativeFilePath = "fixture.js",
    ) => {
      const eslintRuleId = oxlintRuleId.replace(/^([^(]+)\((.+)\)$/u, "$1/$2")
      const messages = await lint(code, `cartridges/app_sfra/cartridge/scripts/${relativeFilePath}`)
      const message = messages.find((item) => item.ruleId === eslintRuleId)

      expect(message?.severity).toBe(expectedEslintSeverity)
      expect(lintWithOxlint(code, relativeFilePath, undefined, expectedOxlintStatus)).toContain(
        oxlintRuleId,
      )
    },
    INTEGRATION_TEST_TIMEOUT,
  )

  test("runs sitegenesis/no-global-require", async () => {
    const code = [
      'const URLUtils = require("dw/web/URLUtils")',
      'function routeA() { return URLUtils.url("Home-Show") }',
      'function routeB() { return "ok" }',
      "exports.RouteA = routeA",
      "exports.RouteB = routeB",
      "",
    ].join("\n")
    const filename = "cartridges/app_sfra/cartridge/controllers/Home.js"
    const messages = await lint(code, filename)
    const output = lintWithOxlint(code, "cartridges/app_sfra/cartridge/controllers/Home.js")

    expect(messages.some((message) => message.ruleId === "sitegenesis/no-global-require")).toBe(
      true,
    )
    expect(output).toContain("sitegenesis(no-global-require)")
  })

  test("runs central architecture overrides through the Oxlint subpath", () => {
    const output = lintWithOxlint(
      'const server = require("server")\nmodule.exports = server\n',
      "cartridges/app_headless/cartridge/scripts/example.js",
      (temporaryDir) => {
        fs.writeFileSync(
          path.join(temporaryDir, "oxlint.config.mjs"),
          `import sfcc, { createOxlintArchitectureOverrides } from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"
          export default {
            lint: {
              ...sfcc.lint,
              overrides: createOxlintArchitectureOverrides({
                configFile: false,
                architectures: { "storefront-next": ["app_headless"] },
              }),
            },
          }\n`,
        )
      },
    )

    expect(output).toContain("sfcc(no-sfra-server)")
  })

  test("exports the SFCC test preset through the published package root", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import config, { createSfccTestConfig } from "@commerce-klaus/eslint-config-sfcc";
         console.log(JSON.stringify({
           rules: createSfccTestConfig()[0].rules,
           preset: Boolean(config.configs["sfcc-test"]),
           plugin: Boolean(config.plugins["sfcc-test"]),
         }))`,
      ],
      { cwd: packageRoot, encoding: "utf8" },
    )
    expect(JSON.parse(output)).toEqual({
      rules: {
        "sfcc-test/no-cartridge-require": "error",
        "sfcc-test/no-concurrent-runtime": "error",
        "sfcc-test/no-hoisted-runtime-mock": "warn",
        "sfcc-test/no-proxyquire": "warn",
        "sfcc-test/no-static-cartridge-import": "warn",
        "sfcc-test/no-tilde-import-outside-cartridge": "warn",
        "sfcc-test/prefer-runtime-globals": "warn",
        "sfcc-test/valid-mock-resolved-path": "error",
      },
      preset: true,
      plugin: true,
    })
  })

  test.each([
    [
      `import { vi as mocks } from "vitest"
       mocks.hoisted(() => import("dw/system/Site"))`,
      0,
      ["no-hoisted-runtime-mock"],
    ],
    [
      `import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       let runtime
       beforeEach(() => { runtime = resetSfccRuntime() })
       test("sample", () => runtime.mockResolved("./provider.js", {}))`,
      1,
      ["valid-mock-resolved-path"],
    ],
    [
      `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       let runtime = getSfccRuntime()
       runtime = other
       runtime.mockResolved("./provider.js", {})
       vi.hoisted(() => ({ load: () => import("dw/system/Site") }))`,
      0,
      [],
    ],
    [
      `import { vi as mocks } from "vitest"
       mocks.stubGlobal("request", {})
       Reflect.deleteProperty(globalThis, "session")
       Object.defineProperty(global, "customer", { value: {} })`,
      0,
      ["prefer-runtime-globals"],
    ],
    [
      `import * as v from "vite-plus/test"
       v.vi.stubGlobal("empty", () => false)
       Object.assign(globalThis, { response: {} })`,
      0,
      ["prefer-runtime-globals"],
    ],
    [
      `function local(vi, Reflect, Object, globalThis) {
         vi.stubGlobal("request", {})
         Reflect.deleteProperty(globalThis, "session")
         Object.assign(globalThis, { response: {} })
       }`,
      0,
      [],
    ],
    [
      `const load = require("proxyquire").noCallThru().noPreserveCache()
       load("./subject", { "./provider": {} })`,
      0,
      ["no-proxyquire"],
    ],
    [
      `import load from "proxyquire"
       await import("proxyquire/lib/proxyquire")
       load("./subject", {})`,
      0,
      ["no-proxyquire"],
    ],
    [
      `import type { Proxyquire } from "proxyquire"
       function local(require) { return require("proxyquire") }
       const proxyquire = (name, mocks) => mocks
       proxyquire("./subject", {})`,
      0,
      [],
    ],
    [
      `import { createRequire as factory } from "node:module"
       const load = factory(import.meta.url)
       load("../custom-cartridges/app_sample/cartridge/scripts/sample.js")
       await import("~/cartridge/scripts/sample.js")`,
      1,
      ["no-cartridge-require", "no-tilde-import-outside-cartridge"],
    ],
    [
      `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       getSfccRuntime().mock("~/cartridge/scripts/sample.js", {})
       await import("*/cartridge/scripts/sample.js")
       function local(require) { return require("dw/system/Site") }`,
      0,
      [],
    ],
    [
      `import { vi as mocks } from "vite-plus/test"
       import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime"
       mocks["hoisted"](() => {
         const runtime = sfcc.getSfccRuntime()
         runtime.mockResolved("./provider.js", {})
       })`,
      1,
      ["no-hoisted-runtime-mock", "valid-mock-resolved-path"],
    ],
    [
      `import { vi } from "vitest"
       import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       const runtime = getSfccRuntime()
       runtime.mockResolved("/workspace/provider.js", {})
       vi.mock("example", () => ({ setup: () => runtime.reset() }))
       function local(vi) { vi.hoisted(() => runtime.reset()) }`,
      0,
      [],
    ],
    [
      `import { test as check } from "vite-plus/test"
       import { getSfccRuntime as getRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       import sample from "../custom-cartridges/app_sample/cartridge/scripts/sample.js"
       const runtime = getRuntime()
       runtime.mock("dw/system/Site", {})
       check.concurrent("example", () => { globalThis.request = sample })`,
      1,
      ["no-concurrent-runtime", "no-static-cartridge-import", "prefer-runtime-globals"],
    ],
    [
      `import { test } from "vitest"
       import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       test("example", async () => {
         resetSfccRuntime().setGlobals({ request: {} })
         await import("../custom-cartridges/app_sample/cartridge/scripts/sample.js")
       })`,
      0,
      [],
    ],
    [
      `import type { SfccTestRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
       import { type Sample } from "../custom-cartridges/app_sample/cartridge/scripts/sample.js"
       test.concurrent("example", () => {})
       function local(globalThis) { return globalThis.request }`,
      0,
      [],
    ],
  ])("runs the SFCC test plugin through its Oxlint export (%#)", (code, status, ruleNames) => {
    const output = lintWithOxlint(
      code,
      "tests/sample.test.ts",
      (temporaryDir) => {
        const scripts = path.join(temporaryDir, "custom-cartridges/app_sample/cartridge/scripts")
        fs.mkdirSync(scripts, { recursive: true })
        fs.writeFileSync(path.join(scripts, "sample.js"), "module.exports = {}")
        fs.writeFileSync(
          path.join(temporaryDir, "oxlint.config.mjs"),
          `import { createOxlintSfccTestOverride } from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"
           export default {
             lint: {
               categories: { correctness: "off" },
               jsPlugins: ["@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test"],
               settings: {
                 sfcc: {
                   configFile: false,
                   cartridgesDir: ${JSON.stringify(path.join(temporaryDir, "custom-cartridges"))},
                   cartridgePath: ["app_sample"],
                 },
               },
               overrides: [createOxlintSfccTestOverride()],
             },
           }`,
        )
      },
      status,
    )
    for (const name of ruleNames) {
      expect(output).toContain(`sfcc-test(${name})`)
    }
    if (ruleNames.length === 0) {
      expect(output).not.toContain("sfcc-test(")
    }
  })

  test.each([
    [false, `beforeEach(() => resetSfccRuntime())`, 1, true],
    [true, `beforeEach(() => resetSfccRuntime())`, 0, false],
    [
      false,
      `beforeEach(() => resetSfccRuntime()); afterEach(() => getSfccRuntime().reset())`,
      0,
      false,
    ],
    [false, `beforeEach(() => resetSfccRuntime()); afterEach(() => vi.restoreAllMocks())`, 1, true],
    [
      false,
      `let runtime; beforeEach(() => { runtime = resetSfccRuntime() }); afterEach(() => runtime.reset())`,
      0,
      false,
    ],
  ])(
    "runs opt-in runtime cleanup through the Oxlint export (%#)",
    (externalCleanup, code, status, reports) => {
      const output = lintWithOxlint(
        `import { resetSfccRuntime, getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"; ${code}`,
        "tests/sample.test.ts",
        (temporaryDir) => {
          fs.writeFileSync(
            path.join(temporaryDir, "oxlint.config.mjs"),
            `export default {
            lint: {
              categories: { correctness: "off" },
              jsPlugins: ["@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test"],
              overrides: [{
                files: ["**/*.test.ts"],
                rules: { "sfcc-test/require-runtime-cleanup": ["error", { externalCleanup: ${externalCleanup} }] },
              }],
            },
          }`,
          )
        },
        status,
      )
      expect(output.includes("sfcc-test(require-runtime-cleanup)")).toBe(reports)
    },
  )

  test("fixes actual import extensions but preserves context-dependent mock IDs in Oxlint", () => {
    const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "commerce-klaus-test-extensions-"))
    try {
      const configFile = path.join(temporaryDir, "oxlint.config.mjs")
      const sampleFile = path.join(temporaryDir, "sample.test.ts")
      const packageLink = path.join(temporaryDir, "node_modules/@commerce-klaus/eslint-config-sfcc")
      const scripts = path.join(temporaryDir, "cartridges/app_sample/cartridge/scripts")
      fs.mkdirSync(path.dirname(packageLink), { recursive: true })
      fs.symlinkSync(packageRoot, packageLink, "junction")
      fs.mkdirSync(scripts, { recursive: true })
      fs.writeFileSync(path.join(scripts, "sample.js"), "module.exports = {}")
      fs.writeFileSync(path.join(temporaryDir, "sample.json"), "{}")
      fs.writeFileSync(
        configFile,
        `export default {
          lint: {
            categories: { correctness: "off" },
            jsPlugins: ["@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test"],
            settings: { sfcc: { configFile: false, cartridgePath: ["app_sample"] } },
            overrides: [{
              files: ["**/*.test.ts"],
              rules: { "sfcc-test/require-file-extension": "error" },
            }],
          },
        }`,
      )
      fs.writeFileSync(
        sampleFile,
        `import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime"
         import type Sample from "./cartridges/app_sample/cartridge/scripts/sample"
         const subject = await import("./cartridges/app_sample/cartridge/scripts/sample")
         sfcc.getSfccRuntime().mock("./sample", {})
         sfcc.getSfccRuntime().mock("~/cartridge/scripts/sample.js", {})
         sfcc.getSfccRuntime().mock("dw/system/Site", {})
         sfcc.getSfccRuntime().mock("server", {})`,
      )
      const result = spawnSync(oxlint, ["--config", configFile, "--fix", sampleFile], {
        cwd: temporaryDir,
        encoding: "utf8",
      })

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(1)
      expect(`${result.stdout}${result.stderr}`).toContain("sfcc-test(require-file-extension)")
      const output = fs.readFileSync(sampleFile, "utf8")
      expect(output).toContain('import("./cartridges/app_sample/cartridge/scripts/sample.js")')
      expect(output).toContain(
        'import type Sample from "./cartridges/app_sample/cartridge/scripts/sample"',
      )
      expect(output).toContain('mock("./sample", {})')
      expect(output).not.toContain('mock("./sample.json"')
      expect(output).toContain('mock("dw/system/Site", {})')
      expect(output).toContain('mock("server", {})')
    } finally {
      fs.rmSync(temporaryDir, { recursive: true, force: true })
    }
  })

  test.each([
    [
      `const runtime = getSfccRuntime(); beforeEach(() => resetSfccRuntime()); test("sample", () => runtime.reset())`,
      true,
    ],
    [
      `let runtime; beforeEach(() => { runtime = resetSfccRuntime() }); test("sample", () => runtime.reset())`,
      false,
    ],
    [
      `const runtime = getSfccRuntime(); describe("first", () => { beforeEach(() => resetSfccRuntime()) }); describe("second", () => { test("sample", () => runtime.reset()) })`,
      false,
    ],
  ])("exposes opt-in stale-runtime analysis in ESLint and Oxlint (%#)", async (body, reports) => {
    const code = `import { getSfccRuntime, resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"; ${body}`
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          plugins: { "sfcc-test": (await import("../dist/index.mjs")).sfccTestPlugin },
          rules: { "sfcc-test/no-stale-runtime-reference": "warn" },
        },
      ],
    })
    const results = await eslint.lintText(code, { filePath: "sample.test.js" })
    expect(
      results[0]?.messages.filter(
        (message) => message.ruleId === "sfcc-test/no-stale-runtime-reference",
      ),
    ).toHaveLength(reports ? 1 : 0)
    const output = lintWithOxlint(
      code,
      "sample.test.js",
      (temporaryDir) => {
        fs.writeFileSync(
          path.join(temporaryDir, "oxlint.config.mjs"),
          `export default {
        lint: {
          categories: { correctness: "off" },
          jsPlugins: ["@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test"],
          rules: { "sfcc-test/no-stale-runtime-reference": "error" },
        },
      }`,
        )
      },
      reports ? 1 : 0,
    )
    expect(output.includes("sfcc-test(no-stale-runtime-reference)")).toBe(reports)
  })

  test("applies the empty migration override through the Oxlint subpath", () => {
    const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "commerce-klaus-oxlint-empty-"))

    try {
      const configFile = path.join(temporaryDir, "oxlint.config.mjs")
      const sampleFile = path.join(temporaryDir, "sample.js")
      const packageLink = path.join(temporaryDir, "node_modules/@commerce-klaus/eslint-config-sfcc")

      fs.mkdirSync(path.dirname(packageLink), { recursive: true })
      fs.symlinkSync(packageRoot, packageLink, "junction")
      fs.writeFileSync(
        configFile,
        `import sfcc, { createOxlintEmptyMigrationOverride } from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"
        export default {
          lint: {
            ...sfcc.lint,
            overrides: [
              createOxlintEmptyMigrationOverride({
                files: ["**/*.js"],
                ignores: [],
              }),
            ],
          },
        }\n`,
      )
      fs.writeFileSync(
        sampleFile,
        "/** @type {string} */\nconst value = getValue()\nmodule.exports = empty(value)\n",
      )

      const result = spawnSync(oxlint, ["--config", configFile, "--fix", sampleFile], {
        cwd: temporaryDir,
        encoding: "utf8",
      })

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0)
      expect(fs.readFileSync(sampleFile, "utf8")).toContain(
        "module.exports = value === null || value === undefined || value.length === 0",
      )
    } finally {
      fs.rmSync(temporaryDir, { recursive: true, force: true })
    }
  })

  test("runs sfcc/valid-hook-export", async () => {
    const relativeFilePath = "cartridges/app_custom/cartridge/scripts/hooks/basket.js"
    const code = "exports.afterPATCH = function () {}\n"
    const writeHookFixture = (temporaryDir: string) => {
      const cartridgeRoot = path.join(temporaryDir, "cartridges/app_custom")
      fs.writeFileSync(
        path.join(cartridgeRoot, "package.json"),
        JSON.stringify({ hooks: "./cartridge/scripts/hooks.json" }),
      )
      fs.writeFileSync(
        path.join(cartridgeRoot, "cartridge/scripts/hooks.json"),
        JSON.stringify({
          hooks: [{ name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" }],
        }),
      )
    }
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eslint-hook-test-"))
    const eslint = new ESLint({
      cwd: fixtureRoot,
      overrideConfigFile: true,
      overrideConfig: createRecommendedConfig({ files: ["**/*.{js,ds}"], ignores: [] }),
    })

    try {
      fs.mkdirSync(path.join(fixtureRoot, path.dirname(relativeFilePath)), { recursive: true })
      fs.writeFileSync(path.join(fixtureRoot, relativeFilePath), code)
      writeHookFixture(fixtureRoot)
      const results = await eslint.lintText(code, {
        filePath: path.join(fixtureRoot, relativeFilePath),
      })

      expect(
        results[0]?.messages.some((message) => message.ruleId === "sfcc/valid-hook-export"),
      ).toBe(true)
      expect(lintWithOxlint(code, relativeFilePath, writeHookFixture)).toContain(
        "sfcc(valid-hook-export)",
      )
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })
  test("runs parser-dependent rules through ESLint after Oxlint", async () => {
    const code = "const x: string = <a/>; empty(customer)"
    const messages = await lintAfterOxlint(code)
    const ruleIds = messages.map((message) => message.ruleId)

    expect(ruleIds).toContain("sfcc/no-e4x-syntax")
    expect(ruleIds).toContain("sfcc/no-type-annotations")
    expect(ruleIds).not.toContain("sfcc/no-ambiguous-empty")
    expect(ruleIds).not.toContain("sfcc/prefer-explicit-empty-check")
    expect(lintWithOxlint(code)).not.toContain("sfcc(no-e4x-syntax)")
    expect(lintWithOxlint(code)).not.toContain("sfcc(no-type-annotations)")
  })

  test("runs sfcc/no-ds-files through ESLint when Oxlint ignores the file", async () => {
    const messages = await lintAfterOxlint(
      "module.exports = {}\n",
      "cartridges/app_sfra/cartridge/scripts/fixture.ds",
    )

    expect(messages.some((message) => message.ruleId === "sfcc/no-ds-files")).toBe(true)
    expect(lintWithOxlint("module.exports = {}\n", "fixture.ds")).toContain(
      "No files found to lint",
    )
  })
})

describe("✅ ES baseline wiring", () => {
  test("✅ no-optional-chaining comes from recommended baseline, not es overrides", async () => {
    expect(esOverrides["es-x/no-optional-chaining"]).toBeUndefined()

    const messages = await lint(`
      const customerNo = req.currentCustomer?.profile?.customerNo
      module.exports = customerNo
    `)

    expect(messages.some((m) => m.ruleId === "es-x/no-optional-chaining")).toBe(true)
  })
})

describe("✅ SFCC Compatibility - Valid ES5 Code", () => {
  test("✅ valid CommonJS module exports", async () => {
    const messages = await lint(`
      const obj = { name: "SFCC", version: 1 }
      function greet(name) {
        return "Hello, " + name
      }
      module.exports = { greet, obj }
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ ES5 for-in loops", async () => {
    const messages = await lint(`
      const obj = { a: 1, b: 2 }
      const keys = []
      for (let key in obj) {
        keys.push(key)
      }
      module.exports = keys
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ ES5 function expressions", async () => {
    const messages = await lint(`
      const handler = function(event) {
        return event.data
      }
      module.exports = { handler }
    `)
    expect(hasErrors(messages)).toBe(false)
  })
})

describe("✅ SFCC Compatibility - Allowed ES2015+ Features", () => {
  test("✅ const declarations", async () => {
    const messages = await lint(`
      const GREETING = "Hello"
      const greet = function(name) { return GREETING + ", " + name }
      module.exports = greet
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ let declarations", async () => {
    const messages = await lint(`
      let counter = 0
      function increment() { counter++ }
      module.exports = increment
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ arrow functions", async () => {
    const messages = await lint(`
      const toUpper = (value) => value.toUpperCase()
      module.exports = toUpper
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ destructuring", async () => {
    const messages = await lint(`
      const source = { id: 1 }
      const { id } = source
      module.exports = id
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ template literals", async () => {
    const messages = await lint(
      'const name = "SFCC"\nconst msg = `Hello ${name}`\nmodule.exports = msg',
    )
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ Object.values", async () => {
    const messages = await lint(`
      const obj = { a: 1, b: 2 }
      const values = Object.values(obj)
      module.exports = values
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ Object.entries", async () => {
    const messages = await lint(`
      const obj = { a: 1, b: 2 }
      const entries = Object.entries(obj)
      entries.forEach(function(entry) {
        const key = entry[0]
        const value = entry[1]
      })
      module.exports = entries
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ for-of loops", async () => {
    const messages = await lint(`
      const arr = [1, 2, 3]
      let doubled
      for (let item of arr) {
        doubled = item * 2
      }
      module.exports = doubled
    `)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ Generator Functions", async () => {
    const messages = await lint(`function* gen() { yield 1 }`)
    expect(hasErrors(messages)).toBe(false)
  })

  test("✅ SFCC-documented Array, String, Object, and Number APIs", async () => {
    const messages = await lint(`
      const values = Array.from({ 0: "a", 1: "b", length: 2 })
      const first = values.find(function(value) { return value === "a" })
      const index = values.findIndex(function(value) { return value === "b" })
      const created = Array.of(first, values[index])
      const text = "SFCC"
      const result = text.includes("FCC") && text.startsWith("S") && text.endsWith("C")
      const padded = text.padStart(6, "0").padEnd(8, "!")
      const repeated = text.repeat(2)
      const codePoint = String.fromCodePoint(83)
      const merged = Object.assign({}, { values: created })
      const finite = Number.isFinite(1) && Number.isNaN(NaN) === false
      const safe = Number.isSafeInteger(1) && Number.parseInt("1", 10) === 1
      const decimal = Number.parseFloat("1.5")
      module.exports = { result, padded, repeated, codePoint, merged, finite, safe, decimal }
    `)
    expect(hasErrors(messages)).toBe(false)
  })
})

describe("❌ SFCC Compatibility - Disallowed ES2015+ Features", () => {
  describe("❌ Frequently used modern syntax that breaks in SFCC", () => {
    test("❌ Optional Chaining", async () => {
      const messages = await lint(`
      function getCustomerId(req) {
        return req.currentCustomer?.profile?.customerNo
      }
      module.exports = getCustomerId
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Nullish Coalescing", async () => {
      const messages = await lint(`
      function resolveLocale(locale) {
        return locale ?? "en_US"
      }
      module.exports = resolveLocale
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Async Functions", async () => {
      const messages = await lint(`
      async function loadAvailability(productID) {
        return { id: productID, available: true }
      }
      module.exports = loadAvailability
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Default Parameters", async () => {
      const messages = await lint(`function greet(name = "World") { return name }`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Rest Parameters", async () => {
      const messages = await lint(`function sum(...args) { return args }`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Spread in function calls", async () => {
      const messages = await lint(`
      const args = [1, 2, 3]
      Math.max(...args)
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Spread in Arrays", async () => {
      const messages = await lint(`
      const arr1 = [1, 2, 3]
      const arr2 = [...arr1, 4, 5]
      module.exports = arr2
    `)
      expect(hasErrors(messages)).toBe(true)
    })
  })

  describe("❌ Additional unsupported language patterns", () => {
    test("❌ ES Module Import", async () => {
      const messages = await lintModule(`import greet from "./greet.js"`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ ES Module Export", async () => {
      const messages = await lintModule(`export default function greet() {}`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Dynamic Import", async () => {
      const messages = await lintModule(`import("./greet.js")`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Classes", async () => {
      const messages = await lint(`class Animal { constructor() {} }`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Class Expressions", async () => {
      const messages = await lint(`const Animal = class { constructor() {} }`)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Computed Property Names", async () => {
      const messages = await lint(`
      var key = "dynamicKey"
      var obj = { [key]: "value" }
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Object Rest/Spread", async () => {
      const messages = await lint(`
      const source = { a: 1, b: 2 }
      const copy = { ...source }
      module.exports = copy
    `)
      expect(hasErrors(messages)).toBe(true)
    })
  })

  describe("❌ Additional unsupported features", () => {
    test("❌ Promises", async () => {
      const messages = await lint(`
      const p = new Promise(function(resolve) { resolve(1) })
      module.exports = p
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Proxy", async () => {
      const messages = await lint(`
      const handler = { get: function() {} }
      const proxy = new Proxy({}, handler)
      module.exports = proxy
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ Reflect API", async () => {
      const messages = await lint(`
      Reflect.get(obj, "key")
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ RegExp u-Flag", async () => {
      const messages = await lint(`
      var regex = /test/u
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ RegExp y-Flag", async () => {
      const messages = await lint(`
      var regex = /test/y
    `)
      expect(hasErrors(messages)).toBe(true)
    })

    test("❌ String.raw", async () => {
      const messages = await lint("const value = String.raw`line1\\nline2`\nmodule.exports = value")
      expect(messages.some((message) => message.ruleId === "sfcc/no-string-raw")).toBe(true)
    })
  })
})

describe("📁 Folder Path Handling", () => {
  test("📁 client folder files are ignored", async () => {
    const messages = await lint(
      `class InvalidInOtherFolders {}`,
      "cartridges/app_sfra/cartridge/client/default/js/app.js",
    )
    // Should not error because client folder is ignored
    expect(hasErrors(messages)).toBe(false)
  })

  test("📁 static folder files are ignored", async () => {
    const messages = await lint(
      `class InvalidInOtherFolders {}`,
      "cartridges/app_sfra/cartridge/static/default/js/app.js",
    )
    // Should not error because static folder is ignored
    expect(hasErrors(messages)).toBe(false)
  })

  test("📁 script folder files are checked", async () => {
    const messages = await lint(
      `class ShouldError {}`,
      "cartridges/app_sfra/cartridge/scripts/product.js",
    )
    // Should error because scripts folder is not ignored
    expect(hasErrors(messages)).toBe(true)
  })

  test("📁 controller folder files are checked", async () => {
    const messages = await lint(
      `class ShouldError {}`,
      "cartridges/app_sfra/cartridge/controllers/Product.js",
    )
    // Should error because controllers folder is not ignored
    expect(hasErrors(messages)).toBe(true)
  })
})
