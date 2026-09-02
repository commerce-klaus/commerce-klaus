# sfcc/no-hooks

Disallows registered hook implementation files in selected cartridges.

This rule is opt-in and is not part of the recommended config or a storefront architecture preset. Hooks can support any storefront architecture, so the package does not infer this policy from the storefront type.

## What it checks

- Reads the cartridge's `package.json` to locate its declared `hooks.json`
- Resolves each registration's `script` path with the same extensions as the SFCC module resolver
- Reports scripts registered for Salesforce `dw.*` hooks and project-specific hooks
- Allows unregistered files even when they are stored in a directory named `hooks`

The rule validates JavaScript files. It does not report `package.json` or `hooks.json` directly because ESLint's SFCC config targets JavaScript and `.ds` files.

## Configuration

Apply the rule only to cartridges that must not register hooks. Disable `valid-hook-export` in the same overlay to avoid secondary diagnostics for forbidden implementations:

```js [eslint.config.js]
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...sfcc.configs.recommended,
  {
    files: ["cartridges/app_storefront/**/*.js"],
    rules: {
      "sfcc/no-hooks": "error",
      "sfcc/valid-hook-export": "off",
    },
  },
]
```

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none
