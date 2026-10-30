# sfcc-test/require-file-extension

An alias of [`sfcc/require-file-extension`](../sfcc/require-file-extension.md),
provided by the test plugin without enabling cartridge language restrictions.
Both names use the same implementation; enable only one per file.

## Default behavior

- ⚪ Off, including in the `sfcc-test` preset: extensionless paths remain valid on SFCC.
- 🛠️ Auto-fix for resolvable imports only; ➖ no auto-fix for runtime mock keys.

Checks static value imports, dynamic imports, native `require()` calls, and
recognized `runtime.mock()` calls. Type-only imports, `dw/*`, bare `server`,
computed module names, and unrelated `.mock()` methods are ignored.

Runtime bindings can be initialized with `const` or assigned in lifecycle hooks
with `let`; all writes must be direct recognized runtime factory calls.
Bindings reassigned to unrelated objects are not treated as runtimes.

```js [Invalid]
runtime.mock("~/cartridge/scripts/helper", helperMock) // [!code warning]
const subject = await import("../cartridges/app_sample/cartridge/scripts/subject") // [!code warning]
```

```js [Valid]
runtime.mock("~/cartridge/scripts/helper.js", helperMock)
runtime.mock("dw/system/Site", siteMock)
const subject = await import("../cartridges/app_sample/cartridge/scripts/subject.js")
```

Mock identifiers refer to cartridge dependencies and are never resolved relative
to the test file or automatically rewritten. `mockResolved()` is not checked by
this rule; it takes an exact resolved file path rather than a module identifier.

See the [shared rule reference](../sfcc/require-file-extension.md) for accepted
extensions, resolution, autofix boundaries, and settings.

## Configuration

After registering the [SFCC test preset](../../index.md#sfcc-test-patterns), add a
test-file override with `"sfcc-test/require-file-extension": "warn"` or `"error"`.

## Oxlint support

Fully supported through `@commerce-klaus/eslint-config-sfcc/oxlint/sfcc-test`.
Both tools share the same implementation, including safe import fixes and
diagnostic-only mock checks.
