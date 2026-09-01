# sfcc/no-controllers

Disallows controller files in SFCC cartridges.

This rule is opt-in and is not part of the recommended config. It is useful for Storefront Next or PWA projects that do not use controllers, and for repositories where only selected cartridges must remain controller-free.

## What it checks

- Reports every file below a `cartridge/controllers/` directory
- Supports Unix and Windows file paths
- Reports the whole file because the directory location itself is invalid

## Configuration

Enable the rule for every cartridge:

```js [eslint.config.js]
export default [
  {
    files: ["cartridges/*/cartridge/controllers/**/*.js"],
    rules: {
      "sfcc/no-controllers": "error",
    },
  },
]
```

Use ESLint's `files` globs to restrict the policy to selected cartridges:

```js [eslint.config.js]
export default [
  {
    files: [
      "cartridges/app_pwa/cartridge/controllers/**/*.js",
      "cartridges/app_storefront_next/cartridge/controllers/**/*.js",
    ],
    rules: {
      "sfcc/no-controllers": "error",
    },
  },
]
```

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none
