# sfcc/no-dw-api

Disallows SFCC `dw/*` APIs in portable JavaScript modules.

This rule is opt-in and is not part of the recommended config or a storefront architecture preset. Apply it to domain, utility, or shared cartridges that must run without the SFCC runtime.

## What it checks

- Reports static `require("dw/*")` calls
- Reports static `import("dw/*")` expressions
- Ignores relative, cartridge, and bare modules outside the `dw/` namespace
- Ignores dynamic module paths because they cannot be checked reliably against the allow list

## Configuration

Register the built-in plugin and apply the rule only to portable cartridges:

```js [eslint.config.js]
import sfccConfig, { sfcc } from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...sfccConfig.configs.recommended,
  {
    files: ["cartridges/lib_domain/**/*.js"],
    plugins: { sfcc },
    rules: {
      "sfcc/no-dw-api": "error",
    },
  },
]
```

## Options

The optional `allow` array accepts exact module paths and namespace entries ending in `/*`:

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/no-dw-api": [
      "error",
      {
        allow: ["dw/value/Money", "dw/util/*"],
      },
    ],
  },
}
```

- `dw/value/Money` allows only that exact module.
- `dw/util/*` allows every module below `dw/util/`.
- `dw/util` is not treated as a prefix; wildcard behavior must be explicit.

## Default behavior

- Severity: off (opt-in)
- Allowed modules: none
- Auto-fix: none

## Example

```js [Invalid]
const Transaction = require("dw/system/Transaction") // [!code error]

module.exports = Transaction
```
