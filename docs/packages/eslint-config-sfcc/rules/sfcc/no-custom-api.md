# sfcc/no-custom-api

Disallows Custom API implementation files in selected cartridges.

This rule is opt-in and is not part of the recommended config or a storefront architecture preset. Custom APIs can serve any storefront architecture, so the package does not infer this policy from the storefront type.

## What it checks

- Reports every JavaScript file below a `cartridge/rest-apis/` directory
- Supports Unix and Windows file paths
- Reports the whole file because its location is itself forbidden by the cartridge policy

Custom API configuration files such as `api.json` and schemas are outside ESLint's JavaScript scope. This rule prevents implementation JavaScript in the directory but does not report non-JavaScript files stored there.

## Configuration

Apply the rule only to cartridges that must not expose Custom APIs. The recommended config already registers the `sfcc` plugin:

```js [eslint.config.js]
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...sfcc.configs.recommended,
  {
    files: ["cartridges/app_storefront/cartridge/rest-apis/**/*.js"],
    rules: {
      "sfcc/no-custom-api": "error",
      "sfcc/no-custom-api-additional-properties": "off",
      "sfcc/no-custom-api-response-methods": "off",
      "sfcc/valid-custom-api-dir-name": "off",
      "sfcc/valid-custom-api-export": "off",
    },
  },
]
```

Disabling the Custom API validation rules in the same overlay avoids secondary diagnostics for files that are forbidden altogether.

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none
