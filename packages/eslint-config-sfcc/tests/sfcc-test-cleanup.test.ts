import parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { expect, test } from "vite-plus/test"

import sfccTestPlugin from "../src/plugins/sfcc-test/index.js"

function lint(code: string, externalCleanup = false) {
  return new Linter().verify(
    code,
    {
      languageOptions: { parser },
      plugins: { "sfcc-test": sfccTestPlugin },
      rules: { "sfcc-test/require-runtime-cleanup": ["warn", { externalCleanup }] },
    },
    { filename: "sample.js" },
  )
}

const imports = `
  import { getSfccRuntime, resetSfccRuntime, loadSfccCustomApi } from "@commerce-klaus/vitest-sfcc"
`

test.each([
  `beforeEach(() => resetSfccRuntime())`,
  `getSfccRuntime().setGlobals({ request: {} })`,
  `const runtime = getSfccRuntime(); runtime.mock("dw/system/Site", {})`,
  `let runtime; beforeEach(() => { runtime = resetSfccRuntime() }); test("sample", () => runtime.setGlobals({ request: {} }))`,
  `loadSfccCustomApi("sample")`,
  `test("sample", async () => { const api = await loadSfccCustomApi("sample"); await api.invoke({}) })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => vi.restoreAllMocks())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => vi.resetModules())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => resetSfccRuntime())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => resetSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { const cleanup = () => getSfccRuntime().reset() })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { if (enabled) getSfccRuntime().reset() })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => enabled && getSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { return; getSfccRuntime().reset() })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => getSfccRuntime().reset?.())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => getSfccRuntime()?.reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => getSfccRuntime?.().reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach?.(() => getSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); function register() { afterEach(() => getSfccRuntime().reset()) }`,
  `beforeEach(() => resetSfccRuntime()); test("sample", () => { afterEach(() => getSfccRuntime().reset()) })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { if (skip) return; getSfccRuntime().reset() })`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; const runtime = createSfccTestRuntime(); runtime.setGlobals({ request: {} }); afterEach(() => getSfccRuntime().reset())`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; const first = createSfccTestRuntime(); const second = createSfccTestRuntime(); first.setGlobals({ request: {} }); afterEach(() => second.reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(cleanup)`,
  `beforeEach(() => resetSfccRuntime()); afterAll(() => getSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); function afterEach(cb) {}; afterEach(() => getSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { const getSfccRuntime = () => fake; getSfccRuntime().reset() })`,
  `beforeEach(() => resetSfccRuntime()); let runtime = getSfccRuntime(); runtime = fake; afterEach(() => runtime.reset())`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; const runtime = createSfccTestRuntime({ globals: { request: {} } })`,
])("reports missing or ineffective runtime cleanup: %s", (code) => {
  const messages = lint(imports + code)
  expect(messages).toHaveLength(1)
  expect(messages[0]).toMatchObject({ messageId: "cleanup", severity: 1 })
})

test.each([
  `beforeEach(() => resetSfccRuntime()); afterEach(() => getSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(async () => await getSfccRuntime().reset())`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { vi.resetModules(); getSfccRuntime().reset() })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { return getSfccRuntime().reset() })`,
  `beforeEach(() => resetSfccRuntime()); afterEach(() => { try { check() } finally { getSfccRuntime().reset() } })`,
  `const runtime = getSfccRuntime(); runtime.mock("dw/system/Site", {}); afterEach(() => runtime.reset())`,
  `let runtime; beforeEach(() => { runtime = resetSfccRuntime() }); afterEach(() => runtime.reset())`,
  `afterEach(() => getSfccRuntime().reset()); describe("nested", () => { beforeEach(() => resetSfccRuntime()) })`,
  `describe("parent", () => { afterEach(() => getSfccRuntime().reset()); describe("child", () => { beforeEach(() => resetSfccRuntime()) }) })`,
  `import { afterEach as cleanup } from "vitest"; beforeEach(() => resetSfccRuntime()); cleanup(() => getSfccRuntime().reset())`,
  `import * as v from "vite-plus/test"; beforeEach(() => resetSfccRuntime()); v.afterEach(() => getSfccRuntime().reset())`,
  `import * as sfcc from "@commerce-klaus/vitest-sfcc/runtime"; sfcc.getSfccRuntime().setGlobals({ request: {} }); afterEach(() => sfcc.getSfccRuntime().reset())`,
  `import { getSfccRuntime as active } from "@commerce-klaus/vitest-sfcc/runtime"; active().setGlobals({ request: {} }); afterEach(() => active().reset())`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; const runtime = createSfccTestRuntime(); runtime.setGlobals({ request: {} }); afterEach(() => runtime.reset())`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; let runtime; beforeEach(() => { runtime = createSfccTestRuntime() }); afterEach(() => runtime.reset())`,
  `import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; const first = createSfccTestRuntime(); const second = createSfccTestRuntime(); afterEach(() => { first.reset(); second.reset() })`,
  `import { getSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"; getSfccTestRuntime().setGlobals({ request: {} }); afterEach(() => getSfccTestRuntime().reset())`,
  `import { getSfccRuntime as unrelated } from "./helper.js"; unrelated().mock("sample", {})`,
  `function sample(resetSfccRuntime) { resetSfccRuntime() }`,
  `const runtime = { setGlobals() {} }; runtime.setGlobals({ request: {} })`,
  `test("ordinary", () => expect(1).toBe(1))`,
])("allows cleaned or unrelated runtime usage: %s", (code) => {
  expect(lint(imports + code)).toEqual([])
})

test("does not use cleanup in a sibling or child suite", () => {
  const code = `${imports}
    beforeEach(() => resetSfccRuntime())
    describe("clean", () => { afterEach(() => getSfccRuntime().reset()) })
    describe("other", () => { beforeEach(() => resetSfccRuntime()) })
  `
  expect(lint(code).map((message) => message.messageId)).toEqual(["cleanup", "cleanup"])
})

test("reports only once per uncovered suite and supports describe.each", () => {
  const code = `${imports}
    describe.each([1])("sample %s", () => {
      beforeEach(() => resetSfccRuntime())
      getSfccRuntime().setGlobals({ request: {} })
      getSfccRuntime().mock("dw/system/Site", {})
    })
  `
  expect(lint(code).map((message) => message.messageId)).toEqual(["cleanup"])
  expect(lint(code + `; afterEach(() => getSfccRuntime().reset())`)).toEqual([])
})

test("explicitly trusts external cleanup without changing the preset", () => {
  expect(lint(imports + `beforeEach(() => resetSfccRuntime())`, true)).toEqual([])
})
