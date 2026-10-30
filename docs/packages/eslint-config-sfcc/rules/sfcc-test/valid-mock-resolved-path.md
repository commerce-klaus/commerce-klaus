# sfcc-test/valid-mock-resolved-path

Requires absolute file paths when registering exact-file SFCC runtime mocks.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🔴 error in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: choosing a module identifier or an exact file is intentional.

## What it checks

Reports `runtime.mockResolved()` calls whose first argument is a string literal or
an expression-free template literal that is not an absolute POSIX or Windows path.
Empty strings, relative paths, cartridge aliases, `dw/*` identifiers, and file URLs
are not absolute filesystem paths.

The runtime stores resolved mock keys unchanged and matches them against resolved
file paths. A relative path or module identifier will not select the intended file;
use `mock()` for identifiers instead.

The rule recognizes runtime factory imports and aliases, namespace imports, direct
factory calls, and local bindings whose writes all come directly from recognized
runtime factories, including `let runtime` assigned in `beforeEach()`.
Bindings with unrelated writes, destructuring, or indirect factory wrappers are
not inferred from names or type annotations.
Unrelated `mockResolved()` methods and shadowed factory names are ignored.

## Examples

```js [Invalid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"

const runtime = getSfccRuntime()
runtime.mockResolved("./provider.js", providerMock) // [!code error]
runtime.mockResolved("*/cartridge/scripts/provider", providerMock) // [!code error]
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
import path from "node:path"

const runtime = getSfccRuntime()
runtime.mock("*/cartridge/scripts/provider", providerMock)
runtime.mockResolved(
  path.resolve(import.meta.dirname, "../cartridges/app_sample/cartridge/scripts/provider.js"),
  providerMock,
)
```

Computed values, including `path.resolve()`, identifiers, and interpolated template
literals, are not evaluated. The rule does not check file existence, normalize
paths, or verify that an absolute path matches a loaded module. Use the exact
resolved path, including the file extension. Windows paths are recognized on every
host for consistent lint results; that does not make them usable on a POSIX host.

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). No rule options are required.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
The same literal and scope checks run in both tools without type information.
