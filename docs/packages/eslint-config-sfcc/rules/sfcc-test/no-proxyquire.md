# sfcc-test/no-proxyquire

Reports Proxyquire-based module loading as a migration opportunity for SFCC tests.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🟡 warning in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: call-through, export shape, and module-cache semantics need review.

## What it checks

Reports loading `proxyquire` or its package subpaths through:

- Static value imports, including namespace and side-effect imports
- Dynamic imports with literal module names
- Native `require()` and recognized `createRequire()` loaders
- Value re-exports, including `export *`

The diagnostic is emitted at the loading site, once per import or require call.
This catches aliased bindings and chained patterns such as
`require("proxyquire").noCallThru().noPreserveCache()` without reporting every
subsequent `.load()` or callable Proxyquire invocation again.

## Examples

```js [Invalid]
const load = require("proxyquire").noCallThru() // [!code warning]
const subject = load("../cartridges/app_sample/cartridge/scripts/subject", {
  "dw/system/Site": siteMock,
})
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  getSfccRuntime().reset()
})
afterEach(() => getSfccRuntime().reset())

test("uses a configured site", async () => {
  getSfccRuntime().mock("dw/system/Site", {
    getCurrent: () => ({ ID: "Example" }),
  })
  const subject = await import("../cartridges/app_sample/cartridge/scripts/subject.js")
  expect(subject.default).toBeDefined()
})
```

Use `runtime.mock()` for the identifiers used by cartridge dependencies and
`runtime.mockResolved()` for an exact resolved file. Register replacements before
importing the subject. Runtime module mocks do not automatically reproduce
Proxyquire's partial call-through, `@noCallThru`, global stubs, or cache options.
Review those behaviors rather than mechanically copying the dependency map.
See [From proxyquire to SFCC-aware Vitest tests](/blog/from-proxyquire-to-sfcc-aware-vitest-tests)
for migration context.

## Boundaries

Type-only imports and re-exports are ignored. Locally shadowed `require()` functions,
similarly named packages, and local functions named `proxyquire` are not reported.
The rule does not follow computed module names, custom loader wrappers, or
Proxyquire bindings imported indirectly from project helpers. Apply the preset
to those helper files explicitly if they load Proxyquire.

Recognized `createRequire()` loaders follow the same boundaries as
[`no-cartridge-require`](./no-cartridge-require.md). This rule is a scoped
migration policy, not a claim that Proxyquire is invalid for ordinary Node.js tests.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). No rule options are required.
Override `"sfcc-test/no-proxyquire"` to `"error"` for a migration gate, or `"off"`
for files intentionally retaining Proxyquire.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
Both tools use the same static module-name, type-only export, and scope checks.
