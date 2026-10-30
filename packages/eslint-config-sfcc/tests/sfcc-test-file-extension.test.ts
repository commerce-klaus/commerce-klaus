import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterAll, expect, test } from "vite-plus/test"

import { sfccTestRules } from "../src/configs/sfcc-test.js"
import sfccTest from "../src/plugins/sfcc-test/index.js"
import sfcc from "../src/plugins/sfcc/index.js"

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sfcc-test-extension-"))
const scripts = path.join(root, "cartridges/app_sample/cartridge/scripts")
fs.mkdirSync(scripts, { recursive: true })
fs.writeFileSync(path.join(scripts, "sample.js"), "module.exports = {}")
fs.writeFileSync(path.join(scripts, "settings.json"), "{}")
fs.mkdirSync(path.join(scripts, "directory"))
fs.writeFileSync(path.join(scripts, "directory/index.js"), "module.exports = {}")
fs.mkdirSync(path.join(root, "tests"))
fs.writeFileSync(path.join(root, "tests/sample.json"), "{}")
afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

function lint(code: string, plugin = "sfcc-test") {
  return new Linter({ cwd: root }).verifyAndFix(
    code,
    {
      files: ["**/*.ts"],
      languageOptions: { parser },
      plugins: { sfcc, "sfcc-test": sfccTest },
      settings: {
        sfcc: { configFile: false, cartridgesDir: "cartridges", cartridgePath: ["app_sample"] },
      },
      rules: { [`${plugin}/require-file-extension`]: "error" },
    },
    { filename: "tests/sample.test.ts" },
  )
}

test("exposes the same opt-in extension rule under both plugin names", () => {
  expect(sfccTest.rules["require-file-extension"]).toBe(sfcc.rules["require-file-extension"])
  expect(sfccTestRules).not.toHaveProperty("sfcc-test/require-file-extension")
})

test.each(["sfcc", "sfcc-test"])("fixes actual imports through %s", (plugin) => {
  const result = lint(
    `import sample from "../cartridges/app_sample/cartridge/scripts/sample";
     import "app_sample/cartridge/scripts/sample";
     await import('*/cartridge/scripts/settings')`,
    plugin,
  )
  expect(result.messages).toEqual([])
  expect(result.fixed).toBe(true)
  expect(result.output).toContain('"../cartridges/app_sample/cartridge/scripts/sample.js"')
  expect(result.output).toContain('"app_sample/cartridge/scripts/sample.js"')
  expect(result.output).toContain("'*/cartridge/scripts/settings.json'")
})

test.each([
  "./sample",
  "../cartridges/app_sample/cartridge/scripts/sample",
  "~/cartridge/scripts/sample",
  "*/cartridge/scripts/sample",
  "app_sample/cartridge/scripts/sample",
])("reports mock IDs without resolving them relative to the test: %s", (source) => {
  const code = `import { getSfccRuntime as getRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
                const runtime = getRuntime(); runtime.mock(${JSON.stringify(source)}, {})`
  const result = lint(code)
  expect(result.messages.map((message) => message.messageId)).toEqual(["missingExtension"])
  expect(result.fixed).toBe(false)
  expect(result.output).toBe(code)
})

test("supports direct calls, namespaces and computed mock methods", () => {
  const result = lint(
    `import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime";
     sfcc.getSfccRuntime()["mock"](\`~/cartridge/scripts/sample\`, {})`,
  )
  expect(result.messages.map((message) => message.messageId)).toEqual(["missingExtension"])
  expect(result.fixed).toBe(false)
})

test("checks mock extensions on bindings assigned in beforeEach", () => {
  const result = lint(
    `import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
     let runtime; beforeEach(() => { runtime = resetSfccRuntime() });
     runtime.mock("~/cartridge/scripts/sample", {})`,
  )
  expect(result.messages.map((message) => message.messageId)).toEqual(["missingExtension"])
  expect(result.fixed).toBe(false)
})

test("ignores mock extensions on bindings reassigned to unrelated objects", () => {
  expect(
    lint(
      `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
     let runtime = getSfccRuntime(); runtime = other;
     runtime.mock("~/cartridge/scripts/sample", {})`,
    ).messages,
  ).toEqual([])
})

test.each([
  `import type Sample from "../cartridges/app_sample/cartridge/scripts/sample";
   import { type SampleShape } from "../cartridges/app_sample/cartridge/scripts/sample"`,
  `import Site from "dw/system/Site"; import server from "server"`,
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   const runtime = getSfccRuntime();
   runtime.mock("dw/system/Site", {}); runtime.mock("server", {});
   runtime.mock("~/cartridge/scripts/sample.js", {});
   runtime.mock("*/cartridge/scripts/settings.json", {});
   runtime.mock("./legacy.ds", {}); runtime.mock(dynamicName, {});
   runtime.mockResolved("/absolute/sample", {})`,
  `const runtime = { mock() {} }; runtime.mock("./sample", {})`,
  `function local(require) { require("./sample") }`,
  `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";
   function local(getSfccRuntime) { getSfccRuntime().mock("./sample", {}) }`,
])("ignores platform IDs, type imports, explicit extensions and unrelated APIs: %s", (code) => {
  expect(lint(code).messages).toEqual([])
})

test("does not guess extensions for missing or directory imports", () => {
  const result = lint(
    `import sample from "../cartridges/app_sample/cartridge/scripts/missing";
     await import("app_sample/cartridge/scripts/directory")`,
  )
  expect(result.messages.map((message) => message.messageId)).toEqual([
    "missingExtension",
    "missingExtension",
  ])
  expect(result.fixed).toBe(false)
})
