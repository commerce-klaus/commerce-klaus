# sfcc-test/no-cartridge-require

Loads SFCC modules through Vite imports instead of native Node.js `require()` in tests.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🔴 error in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: asynchronous imports require deliberate setup and export handling.

## What it checks

Reports native `require()` calls with static SFCC module identifiers:

- `dw/*`, `server`, and `server/*`
- `*/`, `~/`, and named `<cartridge>/cartridge/...` paths, even if unresolved
- Relative and absolute paths resolved to JavaScript modules in configured cartridges

Also recognizes local `const` loaders initialized from named or namespace imports
of Node.js `createRequire(import.meta.url)` or `createRequire(__filename)`.
Unrelated local functions named `require`, Node.js/tooling dependencies, and ordinary
non-cartridge helpers are allowed.

The plugin transforms CommonJS inside cartridge modules. It does not turn native
`require()` in a test into Vite module loading. Using it there bypasses SFCC
resolution, transformation, and runtime integration.

## Examples

```js [Invalid]
const subject = require("../cartridges/app_sample/cartridge/scripts/subject.js") // [!code error]
const Site = require("dw/system/Site") // [!code error]
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  getSfccRuntime().reset()
})
afterEach(() => getSfccRuntime().reset())

test("loads a cartridge module", async () => {
  getSfccRuntime().mock("dw/system/Site", {
    getCurrent: () => ({ ID: "Example" }),
  })
  const subject = await import("../cartridges/app_sample/cartridge/scripts/subject.js")
  expect(subject.default).toBeDefined()
})
```

The rule checks string literals and expression-free template literals. It does not
follow computed identifiers, require aliases, `module.require()`, or loaders anchored
to other files. Unresolved relative paths are not guessed to be cartridge modules.
Cartridge source itself must continue to use CommonJS; apply this rule to tests only.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). Shared `sfcc` settings
and central project configuration determine cartridge discovery.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
The same scope analysis and shared resolver run in both tools without type information.
