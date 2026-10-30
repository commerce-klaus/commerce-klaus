# sfcc-test/no-hoisted-runtime-mock

Keeps SFCC runtime configuration and premature module loading out of hoisted Vitest setup.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🟡 warning in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: moving setup changes evaluation timing.

## What it checks

Reports recognized SFCC runtime setup executed directly in inline `vi.hoisted()`
callbacks and `vi.mock()` factories:

- `resetSfccRuntime()`
- Runtime `mock()`, `mockResolved()`, `setGlobals()`, `unsetGlobals()`, and `reset()` calls

Supports named Vitest imports, aliases, namespace imports, `vi` and `vitest`,
and unshadowed global names from `vitest` or `vite-plus/test`. Runtime detection
supports imported factories and local bindings whose writes all come directly
from recognized runtime factories, including assignment in `beforeEach()`.
Both string and module-promise forms of `vi.mock()` are supported.

Also reports static-string dynamic imports of `dw/*`, bare `server`, and
resolvable JavaScript cartridge modules directly in `vi.hoisted()` callbacks.
Import detection uses the shared cartridge configuration. Imports inside
`vi.mock()` factories are not reported by this import check; their runtime
mutations are still checked.

Vitest hoists these APIs before normal imports and setup. Runtime imports can be
uninitialized at that point, and mock factories do not provide a per-test lifecycle.
Register SFCC runtime mocks and globals in lifecycle hooks or tests before dynamically
importing cartridge code instead.

## Examples

```js [Invalid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { vi } from "vitest"

vi.hoisted(() => {
  getSfccRuntime().mock("dw/system/Site", siteMock) // [!code warning]
})

vi.hoisted(async () => {
  return import("dw/system/Site") // [!code warning]
})

vi.mock("example", () => {
  getSfccRuntime().setGlobals({ request: {} }) // [!code warning]
  return {}
})
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  getSfccRuntime().reset()
  getSfccRuntime().mock("dw/system/Site", {
    getCurrent: () => ({ ID: "Example" }),
  })
})
afterEach(() => getSfccRuntime().reset())
```

Ordinary Vitest mocks remain allowed. Runtime calls and imports inside nested function bodies
are not reported: a mocked method can intentionally access the active runtime when
invoked later. The rule does not follow helper calls, separately declared factories,
or immediately invoked nested functions. It does not inspect `vi.doMock()`, which
is not hoisted. This is a focused guard, not a proof of safe initialization order.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). No rule options are required.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
The same scope and callback-boundary analysis runs in both tools without type information.
