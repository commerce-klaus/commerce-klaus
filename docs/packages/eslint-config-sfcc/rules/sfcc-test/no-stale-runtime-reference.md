# sfcc-test/no-stale-runtime-reference

Reports captured active runtime instances that `beforeEach()` replaces before a
test or cleanup hook uses them.

## Default behavior

- ⚪ Off in both the cartridge `recommended` config and the `sfcc-test` preset.
  Enable it explicitly, normally as a 🟡 warning.
- ➖ No auto-fix or editor suggestion: choosing a fresh getter or shared binding
  changes runtime ownership.

## What it checks

A `const` initialized directly from `getSfccRuntime()` or `getSfccTestRuntime()`
at file or inline suite scope captures the currently active instance. If a
`beforeEach()` in the same suite or an ancestor calls `resetSfccRuntime()`, tests
use a different active instance. Operations on the captured runtime no longer
configure the runtime used by cartridge imports.

The rule reports reads of that binding directly inside inline `test()` / `it()`
callbacks and `afterEach()` callbacks. Imported aliases, namespace imports,
unshadowed Vitest globals, and `describe.each()` suites are supported.
Cleanup or reset hooks in sibling suites do not affect the check.

## Examples

```js [Invalid]
import { getSfccRuntime, resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { beforeEach, test } from "vitest"

const runtime = getSfccRuntime()
beforeEach(() => resetSfccRuntime())

test("uses a site mock", async () => {
  runtime.mock("dw/system/Site", siteMock) // [!code warning]
  await import("../cartridges/app_sample/cartridge/scripts/subject.js")
})
```

```js [Valid]
import { getSfccRuntime, resetSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, test } from "vitest"

beforeEach(() => resetSfccRuntime())
afterEach(() => getSfccRuntime().reset())

test("uses a site mock", async () => {
  const runtime = getSfccRuntime()
  runtime.mock("dw/system/Site", siteMock)
  await import("../cartridges/app_sample/cartridge/scripts/subject.js")
})
```

Alternatively, assign `runtime = resetSfccRuntime()` in `beforeEach()` to a shared
`let runtime` binding. Independent `createSfccTestRuntime()` instances are not
active-runtime captures and are not reported.

Calling `runtime.reset()` clears that instance's state without replacing it.
This alone does not make an existing reference stale.

## Configuration

```js [eslint.config.js]
import { createSfccTestConfig } from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...createSfccTestConfig(),
  {
    files: ["**/*.{test,spec}.{js,ts}"],
    rules: { "sfcc-test/no-stale-runtime-reference": "warn" },
  },
]
```

## Static analysis boundaries

This deliberately checks a narrow, statically recognizable lifecycle pattern.
The capture must be a direct `const` declaration at file or inline suite scope;
the replacement hook must be registered directly in that scope or an ancestor.
Reset calls must be direct hook expressions or statements, including direct
assignments and variable initializers. Conditional resets and resets after
control-flow statements are not analyzed.

Named callbacks, helper calls, nested deferred functions, mutable captures,
destructuring, factories wrapped in other expressions, and runtime replacement
hidden in setup files are not followed. Unusual code that explicitly reactivates
an old instance needs manual review; this rule does not model arbitrary execution.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
Register the test plugin and enable the same rule in a test-file override.
The same scope checks and conservative lifecycle boundaries apply in both tools.
