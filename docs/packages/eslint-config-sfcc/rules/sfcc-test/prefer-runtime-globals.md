# sfcc-test/prefer-runtime-globals

Keeps SFCC test globals under runtime management so cleanup can restore them.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🟡 warning in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: runtime access and import placement need explicit choices.

## What it checks

Reports reads, writes, nested access, and deletion of `customer`, `request`,
`response`, `session`, and `empty` through unshadowed `globalThis` or Node.js
`global`. Static computed properties such as `globalThis["request"]` are included.

Also reports known SFCC global names passed to:

- Vitest's `vi.stubGlobal()` / `vitest.stubGlobal()`, including imported aliases
  and namespace imports from `vitest` or `vite-plus/test`;
- `Reflect.get()`, `set()`, `has()`, `deleteProperty()`, `defineProperty()`, and
  `getOwnPropertyDescriptor()` with `globalThis` or `global` as the target;
- `Object.defineProperty()`, `getOwnPropertyDescriptor()`, and `hasOwn()` with
  that target;
- explicit keys in inline object arguments to `Object.assign()` and
  `Object.defineProperties()` targeting that global object.

Use `setGlobals()`, `getGlobal()`, `hasGlobal()`, and `unsetGlobals()` instead.
Direct global writes are not tracked by the runtime and can escape its cleanup.
Vitest stubs have separate ownership: runtime cleanup does not restore them.
The rule ignores local objects with these names, unrelated globals, and dynamic
property names. Bare identifiers, destructuring, aliases of the global object,
aliased reflection methods, and properties supplied through variables or spreads
are not analyzed. Shadowed `vi`, `vitest`, `Object`, and `Reflect` are ignored.

## Examples

```js [Invalid]
globalThis.request = { locale: "en_US" } // [!code warning]
expect(global.session.custom.channel).toBe("storefront") // [!code warning]
delete globalThis.customer // [!code warning]
vi.stubGlobal("request", { locale: "en_US" }) // [!code warning]
Reflect.deleteProperty(globalThis, "session") // [!code warning]
Object.defineProperty(globalThis, "response", { value: {} }) // [!code warning]
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, expect, test } from "vitest"

afterEach(() => getSfccRuntime().reset())

test("sets the request locale", () => {
  const runtime = getSfccRuntime()
  runtime.setGlobals({ request: { locale: "en_US" } })
  expect(runtime.getGlobal("request")?.locale).toBe("en_US")
  runtime.unsetGlobals("request")
})
```

Configured project globals remain supported by the runtime but are not inferred by
this rule; only the five known runtime globals are checked.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). Apply it to setup files
as well as tests when those files configure runtime globals.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
The same static member and scope checks run in both tools.
