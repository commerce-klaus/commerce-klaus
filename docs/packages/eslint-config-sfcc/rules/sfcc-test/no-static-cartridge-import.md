# sfcc-test/no-static-cartridge-import

Warns about eager SFCC module evaluation in test files that configure runtime state.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🟡 warning in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: moving imports requires a deliberate lifecycle decision.

## What it checks

Reports static value imports, including side-effect imports, of:

- JavaScript cartridge modules resolved through the shared cartridge configuration.
- `dw/*` platform modules and the runtime's `server` module.

The rule activates when the same file calls `resetSfccRuntime()` or calls `mock()`,
`mockResolved()`, `setGlobals()`, `unsetGlobals()`, or `reset()` on a recognized runtime.
It recognizes direct factory calls and local bindings whose writes all come
directly from runtime factories, including `let runtime` assigned in `beforeEach()`,
aliased named imports, and namespace imports. Unrelated writes and indirect
factory wrappers are not treated as runtime bindings.

Static imports execute before test setup regardless of where their declarations
appear. Mocks and globals registered later cannot change the module's initial
evaluation. Use dynamic imports after setup and reset Vitest's module cache when
tests need fresh module evaluation.

## Examples

```js [Invalid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { beforeEach, vi } from "vitest"

import sample from "../cartridges/app_sample/cartridge/scripts/sample.js" // [!code warning]

beforeEach(() => {
  vi.resetModules()
  getSfccRuntime().mock("dw/system/Site", siteMock)
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
  const sample = await import("../cartridges/app_sample/cartridge/scripts/sample.js")
  expect(sample.default.getSiteId()).toBe("Example")
})
```

Type-only imports, non-cartridge helpers, dynamic imports, and static imports in
files without recognizable runtime setup are allowed. Detection is file-local:
setup hidden in helpers or `setupFiles` is not followed, and separate nested suites
are not analyzed for execution reachability. If an eager import is intentional and
independent of setup elsewhere in the file, use a targeted disable with an explanation.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). Shared `sfcc` settings
and the central project configuration determine cartridge discovery and precedence.
Missing or unresolved paths are not guessed to be cartridge files.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
Type-only imports and local scope analysis work in both tools.
