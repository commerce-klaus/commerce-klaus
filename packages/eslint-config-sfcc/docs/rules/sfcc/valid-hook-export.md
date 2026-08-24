# sfcc/valid-hook-export

Requires a static CommonJS export for each Salesforce hook method registered for the current file in the cartridge's `hooks.json`.

## What it checks

- Resolves the cartridge that contains the linted file (the directory directly under `cartridges/`)
- Reads that cartridge's `package.json` `hooks` path and its `hooks.json` registrations
- For every registration whose `script` resolves to the linted file, requires a matching static export
- Only infers the required export name for Salesforce `dw.*` hooks (the method name is the last segment of the extension point, for example `afterPOST` for `dw.ocapi.shop.basket.afterPOST`)
- Project-specific hook names (for example custom extension points like `app.brd.hook.HookShippingProvider.NewStore`) are not checked, because their export name is not implied by the hook name
- Recognizes `exports.method = ...`, `module.exports.method = ...`, and `module.exports = { method: ... }` (including shorthand properties) as valid static exports
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`
- Has no effect on files that are not referenced by any `hooks.json`

## Why this rule exists

`@commerce-klaus/typescript-sfcc` validates the same hook registrations, but only when running `sfcc-ts-typecheck` as a separate step. This rule surfaces the same missing-export problem directly through ESLint, so it also runs in editors and lint-only CI steps that do not run the TypeScript CLI.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```json
// cartridges/app_custom/cartridge/scripts/hooks.json
{
  "hooks": [{ "name": "dw.ocapi.shop.basket.afterPOST", "script": "./hooks/basket" }]
}
```

```js
// bad: cartridges/app_custom/cartridge/scripts/hooks/basket.js
exports.afterPATCH = function (basket) {}
```

```js
// good
exports.afterPOST = function (basket) {}
```
