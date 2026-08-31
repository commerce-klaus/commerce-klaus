# sfcc/no-proprietary-module-syntax

Disallows SFCC-specific module syntax when a project requires portable, standard JavaScript modules.

This rule is opt-in and is not part of the recommended config. That status is not a measure of importance: the recommended config is a conservative baseline, while this rule enforces an architectural convention that each team must choose deliberately. Making that choice explicit is part of the [Commerce Klaus philosophy](/about/philosophy#treat-recommended-configs-as-a-baseline-not-a-ranking).

## What it checks

- Reports `require("*/...")` paths, which search the configured cartridge path
- Reports `require("~/...")` paths, which resolve from the current cartridge
- Reports `module.superModule` and the equivalent `module["superModule"]` access
- Ignores standard relative paths, `dw/*` modules, named cartridge paths, bare modules, and dynamic `require(...)` arguments
- Supports static string literals and template literals without expressions
- Ignores `superModule` access on locally defined variables named `module`

## Options

The optional `allow` array selects which proprietary syntax remains available. Supported values are `"star"`, `"tilde"`, and `"superModule"`. All three are disallowed by default.

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/no-proprietary-module-syntax": ["error", { allow: ["star", "superModule"] }],
  },
}
```

Use an empty array, or omit the options object, to prohibit all proprietary forms. Include every value to permit all forms while retaining the rule for an explicit project convention.

## Why this rule exists

The `*/` and `~/` prefixes and `module.superModule` are SFCC runtime extensions rather than standard CommonJS behavior. Projects can enable this rule to favor explicit relative or named cartridge paths and prevent new code from depending on proprietary module resolution.

## Default behavior

- Severity: off (opt-in)
- Allowed proprietary syntax: none
- Auto-fix: none

## Examples

```js [Invalid]
const helper = require("*/cartridge/scripts/helper") // [!code error]
const localHelper = require("~/cartridge/scripts/helper") // [!code error]
const superModule = module.superModule // [!code error]
```

```js [Valid]
const helper = require("app_storefront/cartridge/scripts/helper")
const localHelper = require("./helper")
```

With `{ allow: ["star", "superModule"] }`:

```js [Valid]
const helper = require("*/cartridge/scripts/helper")
const superModule = module.superModule
```
