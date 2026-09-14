# sfcc/prefer-tilde-require-path

Prefers `~/` require paths over named paths for modules in the importing file's own cartridge.

This rule is not part of the recommended config. It is enabled by the `pwa` and `storefront-next`
architecture presets and remains opt-in for other architectures.

## What it checks

- Reports a named cartridge path when its cartridge name matches the importing file's cartridge
- Ignores named imports from other cartridges, `*/`, `~/`, relative paths, and dynamic paths
- Supports static string and template literal `require(...)` paths
- Preserves the original string delimiter when applying the automatic fix

## Why this rule exists

`~/` states directly that a dependency belongs to the current cartridge and remains correct when
the cartridge is renamed. A named path is still appropriate when importing from another cartridge.

Enable this rule only when `~/` syntax is allowed. Do not combine it with a
`sfcc/no-proprietary-module-syntax` configuration that disallows `tilde`.

## Default behavior

- Severity: off by default; error in the `pwa` and `storefront-next` presets
- Auto-fix: replaces the current cartridge name with `~`

## Examples

In `app_custom/cartridge/scripts/example.js`:

```js [Invalid]
const helper = require("app_custom/cartridge/scripts/helper") // [!code error]
```

```js [Valid]
const helper = require("~/cartridge/scripts/helper")
const baseHelper = require("app_base/cartridge/scripts/helper")
```

## Configuration

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/prefer-tilde-require-path": "error",
  },
}
```

The rule uses the [shared SFCC settings](../../index.md#customize-with-shared-sfcc-settings) to
identify the cartridge containing each linted file.
