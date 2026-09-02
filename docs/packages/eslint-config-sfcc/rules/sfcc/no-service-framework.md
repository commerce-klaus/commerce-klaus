# sfcc/no-service-framework

Disallows Service Framework APIs in selected cartridges.

This rule is opt-in and is not part of the recommended config or a storefront architecture preset. Services can support any storefront architecture, so the package does not infer this policy from the storefront type.

## What it checks

- Reports static `require("dw/svc/*")` calls
- Reports static `import("dw/svc/*")` expressions
- Supports string literals and static template literals
- Ignores modules outside the exact `dw/svc/` namespace
- Ignores dynamic module paths because their target cannot be determined statically

Use this focused rule when a cartridge may use other `dw/*` APIs but must delegate external communication to an integration layer. Use [`sfcc/no-dw-api`](./no-dw-api.md) instead when a cartridge must remain independent of all SFCC APIs.

## Configuration

Apply the rule only to cartridges that must not call external services directly:

```js [eslint.config.js]
import sfccConfig, { sfcc } from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...sfccConfig.configs.recommended,
  {
    files: ["cartridges/lib_domain/**/*.js", "cartridges/app_storefront/**/*.js"],
    plugins: { sfcc },
    rules: {
      "sfcc/no-service-framework": "error",
    },
  },
]
```

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Example

```js [Invalid]
const LocalServiceRegistry = require("dw/svc/LocalServiceRegistry") // [!code error]

module.exports = LocalServiceRegistry.createService("example.http", configuration)
```
