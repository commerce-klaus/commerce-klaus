# sitegenesis/no-global-require

Disallows top-level `require()` calls in SiteGenesis controller files when not every exported route uses the same dependency.

## What it checks

- Applies only to files under `cartridge/controllers/`
- Recognizes routes exported as `exports.Name = route`, `module.exports.Name = route`, and guard-wrapped forms such as `exports.Name = guard.ensure(["get"], route)`
- Distinguishes exported routes from top-level helper functions
- Reports global `require` bindings that are not needed by every exported route
- Names single and shared consumers precisely instead of referring to every top-level function as a route
- Suggests moving a declaration into its only consuming function when that move is structurally safe

## Why this rule exists

SiteGenesis controllers are easier to reason about when route-specific dependencies live inside the route functions that use them. That prevents shared global `require` declarations from leaking into routes that do not need them.

## Default behavior

- 🔴 **Severity:** `error`
- ➖ **Auto-fix:** none
- 💡 **Editor suggestion:** move a single-declarator `require` into its only consuming function

## Options

Set `allowShared` to `true` when dependencies intentionally shared by multiple top-level helpers or routes should remain at module scope. Dependencies used by only one function are still reported.

```js [eslint.config.js]
export default {
  rules: {
    "sitegenesis/no-global-require": ["error", { allowShared: true }],
  },
}
```

## Example

```js [Invalid: controller]
const guard = require("*/cartridge/scripts/guard")
const ProductMgr = require("dw/catalog/ProductMgr") // [!code error]

function start() {
  return ProductMgr.getProduct("example")
}

function submit() {}

exports.Start = guard.ensure(["get"], start)
exports.Submit = guard.ensure(["post"], submit)
```

```js{3} [Valid: controller]
const guard = require("*/cartridge/scripts/guard")

function start() {
  const ProductMgr = require("dw/catalog/ProductMgr")
  return ProductMgr.getProduct("example")
}

function submit() {}

exports.Start = guard.ensure(["get"], start)
exports.Submit = guard.ensure(["post"], submit)
```
