import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterAll, expect, test } from "vite-plus/test"

import { createOxlintSfccTestOverride } from "../src/configs/oxlint.js"
import eslintConfigSfcc, {
  createSfccTestConfig,
  sfccTest,
  sfccTestPlugin,
  sfccTestRules,
} from "../src/index.js"

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-test-lint-"))
const cartridge = path.join(root, "custom-cartridges/app_sample/cartridge/scripts")
fs.mkdirSync(cartridge, { recursive: true })
fs.writeFileSync(path.join(cartridge, "sample.js"), "module.exports = {}")
fs.mkdirSync(path.join(root, "tests"))
fs.writeFileSync(path.join(root, "tests/helper.js"), "export default {}")
afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

test.each([
  `let runtime; beforeEach(() => { runtime = resetSfccRuntime() }); runtime.mockResolved("./provider.js", {})`,
  `let runtime = getSfccRuntime(); runtime.mockResolved("*/cartridge/scripts/provider", {})`,
])("recognizes mutable runtime bindings for resolved mock paths: %s", (code) => {
  expect(
    lint(
      `import { getSfccRuntime, resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"; ${code}`,
      "sfcc-test/valid-mock-resolved-path",
    ).map((message) => message.messageId),
  ).toEqual(["absolutePath"])
})

test.each([
  `let runtime = getSfccRuntime(); runtime = other; runtime.mockResolved("./provider.js", {})`,
  `const runtime = {}; runtime.mockResolved("./provider.js", {})`,
  `let runtime; beforeEach(() => { runtime = unknown() }); runtime.mockResolved("./provider.js", {})`,
  `let runtime; runtime = getSfccRuntime(); function local(runtime) { runtime.mockResolved("./provider.js", {}) }`,
])("does not infer runtime bindings with unrelated writes: %s", (code) => {
  expect(
    lint(
      `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"; ${code}`,
      "sfcc-test/valid-mock-resolved-path",
    ),
  ).toEqual([])
})

test("recognizes mutable runtime bindings for eager import detection", () => {
  expect(
    lint(
      `import Site from "dw/system/Site";
     import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
     let runtime; beforeEach(() => { runtime = getSfccRuntime(); runtime.mock("dw/system/Site", {}) })`,
      "sfcc-test/no-static-cartridge-import",
    ).map((message) => message.messageId),
  ).toEqual(["staticImport"])
})

test("recognizes mutable runtime bindings inside hoisted factories", () => {
  expect(
    lint(
      `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
     let runtime = getSfccRuntime(); vi.hoisted(() => runtime.mock("dw/system/Site", {}))`,
      "sfcc-test/no-hoisted-runtime-mock",
    ).map((message) => message.messageId),
  ).toEqual(["hoistedSetup"])
})

test.each([
  `vi.hoisted(async () => await import("dw/system/Site"))`,
  `import { vi as mocks } from "vitest"; mocks.hoisted(() => import("server"))`,
  `import * as v from "vite-plus/test"; v.vi["hoisted"](() => import("*/cartridge/scripts/sample.js"))`,
  `vi.hoisted(async () => { const module = await import("../custom-cartridges/app_sample/cartridge/scripts/sample.js"); return module })`,
  `vi.hoisted(() => import("app_sample/cartridge/scripts/sample"))`,
])("reports SFCC imports directly inside hoisted callbacks: %s", (code) => {
  expect(
    lint(code, "sfcc-test/no-hoisted-runtime-mock").map((message) => message.messageId),
  ).toEqual(["hoistedImport"])
})

test.each([
  `vi.hoisted(() => import("./helper.js"))`,
  `vi.hoisted(() => ({ load: () => import("dw/system/Site") }))`,
  `vi.hoisted(() => { function load() { return import("dw/system/Site") }; return load })`,
  `vi.mock("example", () => import("dw/system/Site"))`,
  `vi.doMock("example", () => import("dw/system/Site"))`,
  `function local(vi) { vi.hoisted(() => import("dw/system/Site")) }`,
  `vi.hoisted(() => import(dynamicName))`,
  `const load = () => import("dw/system/Site"); vi.hoisted(load)`,
])("allows deferred or unrelated imports in mock setup: %s", (code) => {
  expect(lint(code, "sfcc-test/no-hoisted-runtime-mock")).toEqual([])
})

test.each([
  `vi.stubGlobal("request", {})`,
  `import { vi as mocks } from "vitest"; mocks.stubGlobal("session", {})`,
  `import * as v from "vite-plus/test"; v.vi.stubGlobal("customer", {})`,
  `vitest["stubGlobal"]("empty", () => false)`,
  `Reflect.deleteProperty(globalThis, "request")`,
  `Reflect.set(global, "response", {})`,
  `Reflect.get(globalThis, "session")`,
  `Reflect.has(globalThis, "customer")`,
  `Reflect.defineProperty(globalThis, "empty", { value: () => false })`,
  `Reflect.getOwnPropertyDescriptor(globalThis, "request")`,
  `Object.defineProperty(globalThis, "request", { value: {} })`,
  `Object.getOwnPropertyDescriptor(global, "request")`,
  `Object.hasOwn(globalThis, "request")`,
  `Object.assign(globalThis, { request: {} })`,
  `Object.assign(globalThis, { ["session"]: {} })`,
  `Object.defineProperties(globalThis, { customer: { value: {} } })`,
])("reports SFCC global stubs and reflection: %s", (code) => {
  expect(
    lint(code, "sfcc-test/prefer-runtime-globals").map((message) => message.messageId),
  ).toEqual(["runtimeGlobal"])
})

test.each([
  `vi.stubGlobal("window", {})`,
  `vi.stubGlobal("dw", {})`,
  `vi.stubGlobal(key, {})`,
  `function sample(vi) { vi.stubGlobal("request", {}) }`,
  `import { vi } from "./helper.js"; vi.stubGlobal("request", {})`,
  `function sample(Reflect) { Reflect.deleteProperty(globalThis, "request") }`,
  `function sample(Object) { Object.defineProperty(globalThis, "request", {}) }`,
  `function sample(globalThis) { Reflect.deleteProperty(globalThis, "request") }`,
  `Object.assign(target, { request: {} })`,
  `Object.assign(globalThis, { [key]: {} })`,
  `Reflect.deleteProperty(globalThis, key)`,
  `Reflect.get(globalThis, "window")`,
])("ignores unrelated or shadowed global APIs: %s", (code) => {
  expect(lint(code, "sfcc-test/prefer-runtime-globals")).toEqual([])
})

function lint(code: string, rule?: keyof typeof sfccTestRules, filename = "tests/sample.test.ts") {
  return new Linter({ cwd: root }).verify(
    code,
    [
      ...createSfccTestConfig({
        sfcc: {
          configFile: false,
          cartridgesDir: "custom-cartridges",
          cartridgePath: ["app_sample"],
        },
      }),
      {
        files: ["**/*.ts"],
        languageOptions: { parser },
        ...(rule
          ? {
              rules: Object.fromEntries(
                Object.keys(sfccTestRules).map((name) => [name, name === rule ? "error" : "off"]),
              ),
            }
          : {}),
      },
    ],
    { filename },
  )
}

test("exports an additive test preset without cartridge language restrictions", () => {
  expect(eslintConfigSfcc.configs["sfcc-test"]).toBe(sfccTest)
  expect(eslintConfigSfcc.plugins["sfcc-test"]).toBe(sfccTestPlugin)
  expect(sfccTest[0]?.rules).toEqual(sfccTestRules)
  expect(sfccTest[0]?.languageOptions).toBeUndefined()
  expect(lint("export const load = async () => ({ ...await Promise.resolve({}) })")).toEqual([])
  expect(
    new Linter().verify("globalThis.request = {}", createSfccTestConfig(), {
      filename: "cartridges/app_sample/cartridge/scripts/sample.js",
    }),
  ).toEqual([])
})

test("customizes test and setup globs and exclusions for ESLint and Oxlint", () => {
  const options = { files: ["tests/**/*.js"], ignores: ["tests/fixtures/**"] }
  expect(createSfccTestConfig(options)[0]).toMatchObject(options)
  expect(createOxlintSfccTestOverride(options)).toEqual({
    files: options.files,
    excludeFiles: options.ignores,
    rules: sfccTestRules,
  })
})

test.each([
  `import { test } from "vitest"; test.concurrent("example", () => {})`,
  `import { it as check } from "vite-plus/test"; check.concurrent.each([1])("example", () => {})`,
  `import * as v from "vitest"; v.describe.concurrent("example", () => {})`,
  `test["concurrent"]("example", () => {})`,
  `describe.each([1]).concurrent("example", () => {})`,
  "test.each`value\n${1}`.concurrent('example', () => {})",
])("reports concurrent SFCC tests: %s", (code) => {
  const messages = lint(
    `${code}; import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"`,
    "sfcc-test/no-concurrent-runtime",
  )
  expect(messages.map((message) => message.messageId)).toEqual(["concurrent"])
})

test.each([
  `import { test } from "vitest"; test.concurrent("example", () => {})`,
  `import type { SfccTestRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   test.concurrent("example", () => {})`,
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc";
   function example(test) { test.concurrent("example", () => {}) }`,
  `import { test } from "./helper.js";
   import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc";
   test.concurrent("example", () => {})`,
  `import { test } from "vitest";
   import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc";
   test("example", () => {})`,
])("allows unrelated or sequential tests: %s", (code) => {
  expect(lint(code, "sfcc-test/no-concurrent-runtime")).toEqual([])
})

test("detects runtime use through dynamically imported cartridge modules", () => {
  const messages = lint(
    `test.concurrent("example", async () => {
       await import("../custom-cartridges/app_sample/cartridge/scripts/sample.js")
     })`,
    "sfcc-test/no-concurrent-runtime",
  )
  expect(messages.map((message) => message.messageId)).toEqual(["concurrent"])
})

test.each([
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc";
   getSfccRuntime().mock("dw/system/Site", {})`,
  `import { getSfccRuntime as runtime } from "@commerce-klaus/vitest-sfcc/runtime";
   runtime().setGlobals({ request: {} })`,
  `import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime";
   const runtime = sfcc.getSfccRuntime(); runtime.reset()`,
  `import { resetSfccRuntime as reset } from "@commerce-klaus/vitest-sfcc";
   beforeEach(() => reset())`,
  `import { getSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime";
   const runtime = getSfccTestRuntime(); runtime.mockResolved("/example.js", {})`,
])("reports eager cartridge evaluation with runtime setup: %s", (setup) => {
  const messages = lint(
    `import sample from "../custom-cartridges/app_sample/cartridge/scripts/sample.js"; ${setup}`,
    "sfcc-test/no-static-cartridge-import",
  )
  expect(messages.map((message) => message.messageId)).toEqual(["staticImport"])
})

test.each([
  "dw/system/Site",
  "server",
  "app_sample/cartridge/scripts/sample",
  "*/cartridge/scripts/sample",
])("reports runtime-dependent static module imports: %s", (source) => {
  expect(
    lint(
      `import sample from "${source}";
         import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
         resetSfccRuntime()`,
      "sfcc-test/no-static-cartridge-import",
    ).map((message) => message.messageId),
  ).toEqual(["staticImport"])
})

test.each([
  `import sample from "../custom-cartridges/app_sample/cartridge/scripts/sample.js"`,
  `import type Sample from "../custom-cartridges/app_sample/cartridge/scripts/sample.js";
   import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"; resetSfccRuntime()`,
  `import { type Sample } from "../custom-cartridges/app_sample/cartridge/scripts/sample.js";
   import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"; resetSfccRuntime()`,
  `import sample from "./helper.js";
   import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"; resetSfccRuntime()`,
  `import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"; resetSfccRuntime();
   const sample = await import("../custom-cartridges/app_sample/cartridge/scripts/sample.js")`,
  `import sample from "../custom-cartridges/app_sample/cartridge/scripts/sample.js";
   const runtime = { mock() {} }; runtime.mock()`,
  `import sample from "../custom-cartridges/app_sample/cartridge/scripts/sample.js";
   import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc";
   function setup(getSfccRuntime) { getSfccRuntime().mock() }`,
])("allows safe imports and unrelated setup: %s", (code) => {
  expect(lint(code, "sfcc-test/no-static-cartridge-import")).toEqual([])
})

test("reports side-effect and mixed type/value cartridge imports", () => {
  const messages = lint(
    `import "../custom-cartridges/app_sample/cartridge/scripts/sample.js";
     import { type Sample, value } from "../custom-cartridges/app_sample/cartridge/scripts/sample.js";
     import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"; resetSfccRuntime()`,
    "sfcc-test/no-static-cartridge-import",
  )
  expect(messages.map((message) => message.messageId)).toEqual(["staticImport", "staticImport"])
})

test.each([
  "globalThis.request = {}",
  'global["session"].custom = {}',
  "delete globalThis.customer",
  "expect(globalThis.response).toBeDefined()",
  "globalThis.empty = () => true",
  "globalThis?.request",
])("reports direct access to SFCC test globals: %s", (code) => {
  const messages = lint(code, "sfcc-test/prefer-runtime-globals")
  expect(messages.map((message) => message.messageId)).toEqual(["runtimeGlobal"])
})

test.each([
  "function example(globalThis) { return globalThis.request }",
  "const global = { session: {} }; global.session.custom = {}",
  "globalThis.process; globalThis.fetch; globalThis[dynamicName]",
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   const runtime = getSfccRuntime();
   runtime.setGlobals({ request: {} }); runtime.getGlobal("request"); runtime.unsetGlobals("request")`,
])("allows local objects and runtime-managed globals: %s", (code) => {
  expect(lint(code, "sfcc-test/prefer-runtime-globals")).toEqual([])
})

test.each([
  '""',
  '"./provider.js"',
  '"../provider.js"',
  '"*/cartridge/scripts/provider"',
  '"~/cartridge/scripts/provider"',
  '"app_sample/cartridge/scripts/provider"',
  '"dw/system/Site"',
  '"file:///workspace/provider.js"',
  "`./provider.js`",
  '"C:provider.js"',
])("rejects non-absolute resolved mock keys: %s", (argument) => {
  const messages = lint(
    `import { getSfccRuntime as getRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
     const runtime = getRuntime(); runtime.mockResolved(${argument}, {})`,
    "sfcc-test/valid-mock-resolved-path",
  )
  expect(messages.map((message) => message.messageId)).toEqual(["absolutePath"])
})

test.each([
  '"/workspace/cartridges/app_sample/cartridge/scripts/provider.js"',
  '"C:/workspace/provider.js"',
  JSON.stringify(String.raw`C:\workspace\provider.js`),
  "String.raw`C:\\workspace\\provider.js`",
  '"\\\\\\\\server\\\\share\\\\provider.js"',
  "`/workspace/provider.js`",
  "absolutePath",
  "path.resolve('cartridges/app_sample/cartridge/scripts/provider.js')",
  "`${directory}/provider.js`",
])("allows absolute or dynamically computed resolved mock keys: %s", (argument) => {
  expect(
    lint(
      `import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime";
       sfcc.getSfccRuntime().mockResolved(${argument}, {})`,
      "sfcc-test/valid-mock-resolved-path",
    ),
  ).toEqual([])
})

test("ignores unrelated mockResolved methods and shadowed runtime factories", () => {
  expect(
    lint(
      `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc";
       function local(getSfccRuntime) { getSfccRuntime().mockResolved("./provider.js", {}) }
       const runtime = { mockResolved() {} }; runtime.mockResolved("./provider.js", {})`,
      "sfcc-test/valid-mock-resolved-path",
    ),
  ).toEqual([])
})

test.each([
  `import { vi } from "vitest"; vi.hoisted(() => getRuntime().mock("dw/system/Site", {}))`,
  `import { vi as mocks } from "vite-plus/test";
   mocks.mock("example", () => { getRuntime().setGlobals({ request: {} }); return {} })`,
  `import * as v from "vitest";
   v.vi["hoisted"](function () { getRuntime().reset() })`,
  `import { vitest as v } from "vitest";
   v["mock"]("example", async () => { getRuntime().mockResolved("/provider.js", {}); return {} })`,
  `vi.hoisted(() => { const runtime = getRuntime(); runtime.unsetGlobals("request") })`,
  `vitest.mock(import("example"), () => { getRuntime().mock("dw/system/Site", {}); return {} })`,
])("reports SFCC mutations directly in hoisted callbacks: %s", (code) => {
  const messages = lint(
    `import { getSfccRuntime as getRuntime } from "@commerce-klaus/vitest-sfcc/runtime"; ${code}`,
    "sfcc-test/no-hoisted-runtime-mock",
  )
  expect(messages.map((message) => message.messageId)).toEqual(["hoistedSetup"])
})

test("reports resetSfccRuntime in hoisted factories", () => {
  expect(
    lint(
      `import { vi } from "vitest";
       import { resetSfccRuntime as reset } from "@commerce-klaus/vitest-sfcc";
       vi.hoisted(() => reset())`,
      "sfcc-test/no-hoisted-runtime-mock",
    ).map((message) => message.messageId),
  ).toEqual(["hoistedSetup"])
})

test("reports each direct setup call inside conditional factory blocks", () => {
  expect(
    lint(
      `import { vi } from "vitest";
       import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
       const runtime = getSfccRuntime();
       vi.mock("example", () => {
         if (enabled) { runtime.reset(); runtime.setGlobals({ request: {} }) }
         return {}
       })`,
      "sfcc-test/no-hoisted-runtime-mock",
    ).map((message) => message.messageId),
  ).toEqual(["hoistedSetup", "hoistedSetup"])
})

test.each([
  `vi.mock("example", () => ({ getSite: () => getRuntime().setGlobals({ request: {} }) }))`,
  `vi.hoisted(() => { function later() { getRuntime().reset() }; return later })`,
  `vi.doMock("example", () => { getRuntime().reset(); return {} })`,
  `vi.mock("example", () => ({ value: "mocked" }))`,
  `beforeEach(() => getRuntime().reset())`,
  `import { vi } from "./helper.js"; vi.hoisted(() => getRuntime().reset())`,
  `function local(vi) { vi.hoisted(() => getRuntime().reset()) }`,
  `vi.hoisted(() => { const runtime = { reset() {} }; runtime.reset() })`,
  `import { vi } from "vitest";
   function local(getRuntime) { vi.mock("example", () => getRuntime().reset()) }`,
])("allows deferred runtime setup and unrelated mock APIs: %s", (code) => {
  expect(
    lint(
      `import { getSfccRuntime as getRuntime } from "@commerce-klaus/vitest-sfcc/runtime"; ${code}`,
      "sfcc-test/no-hoisted-runtime-mock",
    ),
  ).toEqual([])
})

test.each([
  '"dw/system/Site"',
  '"server"',
  '"server/router"',
  '"*/cartridge/scripts/sample"',
  '"~/cartridge/scripts/sample.js"',
  '"app_sample/cartridge/scripts/missing.js"',
  '"../custom-cartridges/app_sample/cartridge/scripts/sample.js"',
  "`../custom-cartridges/app_sample/cartridge/scripts/sample`",
  JSON.stringify(path.join(cartridge, "sample.js")),
])("reports native SFCC require calls in tests: %s", (source) => {
  expect(
    lint(`const sample = require(${source})`, "sfcc-test/no-cartridge-require").map(
      (message) => message.messageId,
    ),
  ).toEqual(["nativeRequire"])
})

test.each([
  `import { createRequire as factory } from "node:module";
   const load = factory(import.meta.url); load("dw/system/Site")`,
  `import * as module from "module";
   const require = module.createRequire(import.meta.url); require("server")`,
  `import { createRequire } from "node:module";
   const load = createRequire(__filename); load("server")`,
])("reports createRequire loaders for SFCC modules: %s", (code) => {
  expect(lint(code, "sfcc-test/no-cartridge-require").map((message) => message.messageId)).toEqual([
    "nativeRequire",
  ])
})

test.each([
  `require("node:fs"); require("vitest"); require("./helper.js")`,
  `require("./missing.js"); require(moduleName); require(\`./\${moduleName}\`)`,
  `function local(require) { return require("dw/system/Site") }`,
  `const require = (name) => name; require("*/cartridge/scripts/sample.js")`,
  `import { createRequire } from "./helper.js";
   const load = createRequire(); load("dw/system/Site")`,
  `import { createRequire } from "node:module";
   const load = createRequire("/another/project/file.js"); load("./sample.js")`,
  `await import("*/cartridge/scripts/sample.js")`,
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   getSfccRuntime().mock("~/cartridge/scripts/sample.js", {})`,
])("allows non-native or non-SFCC requires and proper imports: %s", (code) => {
  expect(lint(code, "sfcc-test/no-cartridge-require")).toEqual([])
})

test.each([
  `import sample from "~/cartridge/scripts/sample.js"`,
  `import "~/cartridge/scripts/sample.js"`,
  `await import("~/cartridge/scripts/sample.js")`,
  "await import(`~/cartridge/scripts/sample.js`)",
  `require("~/cartridge/scripts/sample.js")`,
  `import { createRequire } from "node:module";
   const load = createRequire(import.meta.url); load("~/cartridge/scripts/sample.js")`,
])("reports tilde imports without an importing cartridge: %s", (code) => {
  expect(
    lint(code, "sfcc-test/no-tilde-import-outside-cartridge").map((message) => message.messageId),
  ).toEqual(["noCartridge"])
})

test.each([
  `import type Sample from "~/cartridge/scripts/sample.js"`,
  `import { type Sample } from "~/cartridge/scripts/sample.js"`,
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   getSfccRuntime().mock("~/cartridge/scripts/sample.js", {})`,
  `await import("*/cartridge/scripts/sample.js")`,
  `await import("app_sample/cartridge/scripts/sample.js")`,
  `await import("../custom-cartridges/app_sample/cartridge/scripts/sample.js")`,
  `function local(require) { require("~/cartridge/scripts/sample.js") }`,
])("allows mock keys, type-only imports and other import forms: %s", (code) => {
  expect(lint(code, "sfcc-test/no-tilde-import-outside-cartridge")).toEqual([])
})

test("allows tilde imports inside a configured cartridge", () => {
  expect(
    lint(
      `await import("~/cartridge/scripts/sample.js")`,
      "sfcc-test/no-tilde-import-outside-cartridge",
      "custom-cartridges/app_sample/cartridge/scripts/sample.test.ts",
    ),
  ).toEqual([])
})

test("does not mistake similarly named paths for a cartridge", () => {
  expect(
    lint(
      `await import("~/cartridge/scripts/sample.js")`,
      "sfcc-test/no-tilde-import-outside-cartridge",
      "custom-cartridges/app_sample_other/sample.test.ts",
    ).map((message) => message.messageId),
  ).toEqual(["noCartridge"])
})

test("checks native requires in CommonJS test files", () => {
  const messages = new Linter().verify(
    `const Site = require("dw/system/Site")`,
    createSfccTestConfig(),
    { filename: "tests/sample.test.cjs" },
  )
  expect(messages.map((message) => message.messageId)).toEqual(["nativeRequire"])
})

test("checks mixed type/value tilde imports as actual module loads", () => {
  expect(
    lint(
      `import { type SampleShape, sample } from "~/cartridge/scripts/sample.js"`,
      "sfcc-test/no-tilde-import-outside-cartridge",
    ).map((message) => message.messageId),
  ).toEqual(["noCartridge"])
})

test.each([
  `const proxyquire = require("proxyquire")`,
  `const load = require("proxyquire").noCallThru().noPreserveCache();
   load("./subject", { "./provider": {} })`,
  `require("proxyquire")("./subject", {})`,
  "require(`proxyquire`)",
  `import load from "proxyquire"; load("./subject", {})`,
  `import * as proxyquire from "proxyquire"; proxyquire.load("./subject", {})`,
  `import "proxyquire"`,
  `import { type Proxyquire, default as load } from "proxyquire"`,
  `await import("proxyquire")`,
  `require("proxyquire/lib/proxyquire")`,
  `export { default as load } from "proxyquire"`,
  `export * from "proxyquire"`,
  `export * as legacy from "proxyquire"`,
  `export { type Proxyquire, load } from "proxyquire"`,
  `import { createRequire as factory } from "node:module";
   const load = factory(import.meta.url); load("proxyquire")`,
])("reports Proxyquire at its loading site: %s", (code) => {
  const messages = lint(code, "sfcc-test/no-proxyquire")
  expect(messages.map((message) => message.messageId)).toEqual(["proxyquire"])
  expect(messages[0]?.fix).toBeUndefined()
  expect(messages[0]?.suggestions).toBeUndefined()
})

test.each([
  `import type { Proxyquire } from "proxyquire"`,
  `import { type Proxyquire } from "proxyquire"`,
  `export type { Proxyquire } from "proxyquire"`,
  `export { type Proxyquire } from "proxyquire"`,
  `export type * from "proxyquire"`,
  `const proxyquire = (name, mocks) => mocks; proxyquire("./subject", {})`,
  `function local(require) { return require("proxyquire") }`,
  `require("./proxyquire"); require("proxyquire-helper"); require("@example/proxyquire")`,
  "require(moduleName); import(`proxyquire/${entry}`)",
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   getSfccRuntime().mock("*/cartridge/scripts/provider", {});
   await import("*/cartridge/scripts/subject.js")`,
])("ignores type-only references and unrelated Proxyquire-like names: %s", (code) => {
  expect(lint(code, "sfcc-test/no-proxyquire")).toEqual([])
})

test("enables Proxyquire migration warnings in CommonJS tests", () => {
  const messages = new Linter().verify(
    `const load = require("proxyquire").noCallThru(); load("./subject", {})`,
    createSfccTestConfig(),
    { filename: "tests/sample.test.cjs" },
  )
  expect(messages.map((message) => [message.messageId, message.severity])).toEqual([
    ["proxyquire", 1],
  ])
})
