import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import sfccTest from "../src/plugins/sfcc-test/index.js"

function lint(code: string) {
  return new Linter().verify(code, {
    languageOptions: { parser },
    plugins: { "sfcc-test": sfccTest },
    rules: { "sfcc-test/no-stale-runtime-reference": "warn" },
  })
}

const imports = `import { getSfccRuntime, resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime";`

test.each([
  `beforeEach(() => resetSfccRuntime()); describe("nested", () => { const runtime = getSfccRuntime(); test("sample", () => runtime.reset()) })`,
  `const runtime = getSfccRuntime(); beforeEach(() => resetSfccRuntime()); test("sample", () => runtime.mock("dw/system/Site", {}))`,
  `const runtime = getSfccRuntime(); beforeEach(() => { resetSfccRuntime() }); afterEach(() => runtime.reset())`,
  `describe("sample", () => { const runtime = getSfccRuntime(); beforeEach(() => { const current = resetSfccRuntime() }); it("sample", () => runtime.setGlobals({ request: {} })) })`,
  `const runtime = getSfccRuntime(); describe.each([1])("sample", () => { beforeEach(() => resetSfccRuntime()); test("sample", () => expect(runtime.getGlobal("request")).toBeDefined()) })`,
  `import { beforeEach as setup, it as check } from "vitest"; const runtime = getSfccRuntime(); setup(() => resetSfccRuntime()); check("sample", () => runtime.reset())`,
  `import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime"; import * as v from "vite-plus/test"; const runtime = sfcc.getSfccRuntime(); v.beforeEach(() => sfcc.resetSfccRuntime()); v.test("sample", () => runtime.reset())`,
  `import { getSfccRuntime as active } from "@commerce-klaus/vitest-sfcc/runtime"; const runtime = active(); beforeEach(() => resetSfccRuntime()); test("sample", () => runtime.reset())`,
])("reports captured active runtime references: %s", (code) => {
  expect(lint(imports + code).map((message) => message.messageId)).toEqual(["stale"])
})

test.each([
  `const runtime = getSfccRuntime(); beforeEach(() => { return; resetSfccRuntime() }); test("sample", () => runtime.reset())`,
  `let runtime; beforeEach(() => { runtime = resetSfccRuntime() }); test("sample", () => runtime.reset())`,
  `beforeEach(() => resetSfccRuntime()); test("sample", () => { const runtime = getSfccRuntime(); runtime.reset() })`,
  `const runtime = getSfccRuntime(); beforeEach(() => runtime.reset()); test("sample", () => runtime.reset())`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; const runtime = createSfccTestRuntime(); beforeEach(() => resetSfccRuntime()); test("sample", () => runtime.reset())`,
  `const runtime = getSfccRuntime(); describe("first", () => { beforeEach(() => resetSfccRuntime()) }); describe("second", () => { test("sample", () => runtime.reset()) })`,
  `const runtime = getSfccRuntime(); function local(beforeEach) { beforeEach(() => resetSfccRuntime()) }; test("sample", () => runtime.reset())`,
  `const runtime = getSfccRuntime(); beforeEach(() => resetSfccRuntime()); test("sample", (runtime) => runtime.reset())`,
  `const runtime = getSfccRuntime(); beforeEach(() => { if (enabled) resetSfccRuntime() }); test("sample", () => runtime.reset())`,
  `const runtime = getSfccRuntime(); beforeEach(() => { const deferred = () => resetSfccRuntime() }); test("sample", () => runtime.reset())`,
  `const runtime = getSfccRuntime(); beforeEach(() => resetSfccRuntime()); const deferred = () => runtime.reset()`,
  `import { getSfccRuntime as local } from "./helper.js"; const runtime = local(); beforeEach(() => resetSfccRuntime()); test("sample", () => runtime.reset())`,
])("allows refreshed or unrelated runtime references: %s", (code) => {
  expect(lint(imports + code)).toEqual([])
})
