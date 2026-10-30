# sfcc-test/require-runtime-cleanup

Requires explicit per-test cleanup for locally visible SFCC test runtime state.

## Default behavior

- ⚪ Off in both the cartridge `recommended` config and the `sfcc-test` preset.
  Enable it explicitly, normally as a 🟡 warning.
- ➖ No auto-fix or editor suggestion: hook placement and cleanup ownership require
  project context.

## What it checks

Reports once per uncovered suite when it finds `resetSfccRuntime()`,
`createSfccTestRuntime()`, runtime
`mock()`, `mockResolved()`, `setGlobals()`, `unsetGlobals()`, `controller()`,
`customApi()`, `jobStep()`, `registerHook()`, or `callHook()`, or the integration loaders
`loadSfccCustomApi()`, `loadSfccHook()`, and `loadSfccJobStep()`.
Metadata-driven harnesses can install globals without a direct `setGlobals()`
call in the test.

A directly registered `afterEach()` in the same suite or an ancestor must reset
the runtime. Cleanup in a sibling or child suite does not cover the parent.
Named and namespace imports, aliases, and unshadowed Vitest globals are supported
for `vitest` and `vite-plus/test`, including inline `describe.each()` suites.

Recognized cleanup includes `getSfccRuntime().reset()`,
`getSfccTestRuntime().reset()`, and `.reset()` on a local variable whose writes
all come from recognized runtime factories. This includes
`let runtime; beforeEach(() => { runtime = resetSfccRuntime() })`.
Independent `createSfccTestRuntime()` bindings must be reset through the same
binding; resetting the active runtime or another independent binding does not
count.

These are **not** runtime cleanup:

- `vi.restoreAllMocks()` restores spies.
- `vi.resetModules()` clears the module cache.
- `resetSfccRuntime()` replaces the active instance without restoring globals
  owned by the previous instance.
- `afterAll()` runs too late to isolate individual tests.
- Optional or conditional reset calls, uninvoked nested functions, and calls to
  arbitrary cleanup helpers do not establish unconditional local cleanup.

## Examples

```js [Invalid]
import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, vi } from "vitest"

beforeEach(() => resetSfccRuntime()) // [!code warning]
afterEach(() => vi.restoreAllMocks())
```

```js [Valid]
import { getSfccRuntime, resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  resetSfccRuntime()
})

afterEach(() => {
  getSfccRuntime().reset()
  vi.resetModules()
})
```

## Configuration

```js [eslint.config.js]
import { createSfccTestConfig } from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...createSfccTestConfig(),
  {
    files: ["**/*.{test,spec}.{js,ts}"],
    rules: { "sfcc-test/require-runtime-cleanup": "warn" },
  },
]
```

| Option            | Default | Meaning                                                                                           |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `externalCleanup` | `false` | Trust cleanup registered by setup files or shared infrastructure instead of checking local hooks. |

If a configured Vitest `setupFiles` module really registers runtime cleanup,
declare that boundary explicitly:

```js
rules: {
  "sfcc-test/require-runtime-cleanup": ["warn", { externalCleanup: true }],
}
```

::: warning External cleanup must actually exist
The rule does not read Vitest configuration or execute setup files.
`externalCleanup: true` suppresses local cleanup diagnostics; it does not install
or verify a central hook.
:::

## Static analysis boundaries

This is a local pattern check, not a proof of test isolation. Hooks must be direct
expression statements in the file or an inline suite body. Inline hook callbacks
can contain direct reset statements, returned or awaited resets, and resets in
`finally`. Analysis stops after control-flow statements; it does not follow
named callbacks, helper calls, variable aliases, or arbitrary branches.

The rule does not trace cartridge imports, mutations hidden inside helper modules,
runtime replacement order, or the execution order of multiple hooks. Bindings
assigned from active-runtime factories are treated as the active runtime; keeping
stale references after replacing it remains the caller's responsibility.
Type annotations alone do not establish a runtime binding.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
After registering the plugin, append a test-file override:

```js
{
  files: ["**/*.{test,spec}.{js,ts}"],
  rules: { "sfcc-test/require-runtime-cleanup": "warn" },
}
```

The same options, suite boundaries, and static-analysis limitations apply.
