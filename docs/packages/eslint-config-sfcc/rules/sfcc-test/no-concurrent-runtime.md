# sfcc-test/no-concurrent-runtime

Prevents concurrent tests and suites from sharing mutable SFCC test runtime state.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🔴 error in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: changing scheduling can change test behavior.

## What it checks

Reports `test.concurrent`, `it.concurrent`, and `describe.concurrent` in files with
value imports from the SFCC test integration or runtime, or static/dynamic imports
of SFCC modules. Cartridge modules are identified through the shared resolver.

Supports named imports and aliases from `vitest` and `vite-plus/test`, namespace
imports, and unshadowed Vitest global names. Chained modifiers such as
`test.concurrent.each()` and `test.each().concurrent()` are included. Type-only
imports do not activate the rule. Unrelated or locally shadowed APIs are ignored.

Mocks, globals, controllers, hook registrations, and recorded calls belong to the
active runtime within a worker. Concurrent tests can overwrite or reset one another's
state even when every test has lifecycle hooks.

## Examples

```js [Invalid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { test } from "vitest"

test.concurrent("loads an example", () => {
  // [!code error]
  getSfccRuntime().setGlobals({ request: { locale: "en_US" } })
})
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, test } from "vitest"

afterEach(() => getSfccRuntime().reset())

test("loads an example", () => {
  getSfccRuntime().setGlobals({ request: { locale: "en_US" } })
})
```

The rule does not inspect Vitest's project-wide concurrent scheduling options,
runtime use hidden behind helper modules, or custom test APIs exported by wrappers.
Keep SFCC test projects sequential even when those patterns are not locally visible.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns) or enable this rule on
selected test files through the exported `sfccTestPlugin`.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
The same scope and import analysis runs in both tools; no type information is required.
