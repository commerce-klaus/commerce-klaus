# sfcc-test/no-tilde-import-outside-cartridge

Requires an importing cartridge for actual `~/` module imports, not for mock keys.

## Default behavior

- ⚪ Off in the cartridge `recommended` config; 🟡 warning in the `sfcc-test` preset.
- ➖ No auto-fix or editor suggestion: choosing a relative, named, or wildcard import changes resolution intent.

## What it checks

Reports static value imports, dynamic imports, and native `require()` calls using
`~/` when the test file is outside the configured cartridge roots.
The shared resolver identifies the importing cartridge; directory names alone are
not enough.

`~/` means the importer's own cartridge. Most tests live in a separate `tests/`
directory and have no such context. Use a relative path, an explicit cartridge
alias, or `*/` if cartridge-path precedence is intentional.

## Examples

In a test file outside the configured cartridges:

```js [Invalid]
const subject = await import("~/cartridge/scripts/subject.js") // [!code warning]
```

```js [Valid]
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"

getSfccRuntime().mock("~/cartridge/scripts/helper.js", helperMock)
const subject = await import("../cartridges/app_sample/cartridge/scripts/subject.js")
```

The mock key refers to an identifier used in cartridge code, not to the location
of the test. It is allowed. Actual `~/` imports inside configured cartridges and
TypeScript type-only imports are also allowed.

Computed module names, re-exports, and custom loader wrappers are not analyzed.
Recognized `createRequire()` loaders follow the same boundaries as
[`no-cartridge-require`](./no-cartridge-require.md).

## Configuration

Use the [SFCC test preset](../../index.md#sfcc-test-patterns). The rule reads shared
`sfcc` settings and central project configuration; it has no rule options.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
Both tools use the same cartridge discovery and type-only import checks.
