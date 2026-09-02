# sfcc/no-controllers

Disallows controller files in SFCC cartridges.

This rule is opt-in and is not part of the recommended config. It is useful for Storefront Next or PWA projects that do not use controllers, and for repositories where only selected cartridges must remain controller-free.

## What it checks

- Reports every file below a `cartridge/controllers/` directory
- Supports Unix and Windows file paths
- Reports the whole file because the directory location itself is invalid

## Configuration

Use a storefront policy preset to enable the rule for every relevant cartridge:

```js [eslint.config.js]
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default [sfcc.configs.recommended, sfcc.configs.pwa]
```

Use `createStorefrontConfig()` to restrict the policy to selected cartridges:

```js [eslint.config.js]
import sfcc, { createStorefrontConfig } from "@commerce-klaus/eslint-config-sfcc"

export default [
  sfcc.configs.recommended,
  createStorefrontConfig("pwa", {
    cartridges: ["app_pwa", "app_storefront_next"],
  }),
]
```

The `storefront-next` and `pwa` presets enable this rule. It can still be configured manually when no architecture preset fits the project.

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none
