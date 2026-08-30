# sfcc/valid-custom-api-dir-name

Requires [Custom API](https://developer.salesforce.com/docs/commerce/commerce-api/guide/custom-apis.html) `rest-apis` directory names to contain only lowercase alphanumeric characters and hyphens.

## What it checks

- Only applies to files referenced as an `implementation` by a sibling `api.json` (the same check `sfcc/valid-custom-api-export` uses to scope itself)
- Validates the name of the directory that directly contains the `api.json`/implementation script against `^[a-z0-9-]+$`
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`

## Why this rule exists

Salesforce B2C Commerce requires Custom API directory names to only contain alphanumeric lowercase characters and hyphens; other names are rejected during registration. This rule surfaces the same restriction directly through ESLint.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```diff
- cartridges/app_custom/cartridge/rest-apis/loyaltyInfo/api.json
+ cartridges/app_custom/cartridge/rest-apis/loyalty-info/api.json
```
