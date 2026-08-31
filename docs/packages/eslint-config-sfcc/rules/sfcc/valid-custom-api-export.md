# sfcc/valid-custom-api-export

Requires a public static CommonJS export for each [Custom API](https://developer.salesforce.com/docs/commerce/commerce-api/guide/custom-apis.html) endpoint mapped to the current file in the `rest-apis` `api.json`.

## What it checks

- Resolves the `api.json` in the same directory as the linted file
- For every endpoint entry whose `implementation` resolves to the linted file, requires:
  - a static export named after the `endpoint` (for example `exports.getLoyaltyInfo = ...`)
  - that export marked as public: `exports.getLoyaltyInfo.public = true`
- Recognizes `exports.method = ...` and `module.exports.method = ...` as valid static exports, and `exports.method.public = true` / `module.exports.method.public = true` as the public flag
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`
- Has no effect on files that are not referenced as an `implementation` by any `api.json`

## Why this rule exists

Custom API endpoints are only registered when the implementation script exports a function matching the `operationId` and marks it `public`. Salesforce Commerce Cloud only reports this at code-version activation time. This rule surfaces the same requirement directly through ESLint, in editors and lint-only CI steps.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```json{3} [api.json]
{
  "endpoints": [
    { "endpoint": "getLoyaltyInfo", "schema": "schema.yaml", "implementation": "script" }
  ]
}
```

```js [Invalid script.js]
// [!code error:1]
exports.getLoyaltyInfo = function () {}
```

```js{2} [Valid script.js]
exports.getLoyaltyInfo = function () {}
exports.getLoyaltyInfo.public = true
```
