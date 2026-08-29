[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/babel-plugin-sfcc-modules

Babel plugin for resolving Salesforce Commerce Cloud server-side module patterns in Babel-based tests and tooling.

## Highlights

- Rewrites `require("*/...")` by cartridge order
- Rewrites `require("~/...")` for the current cartridge
- Resolves cartridge aliases and `module.superModule`
- Supports explicit and inferred cartridge paths

## Install

```bash
pnpm add -D @commerce-klaus/babel-plugin-sfcc-modules
```

```json
{
  "plugins": [
    [
      "@commerce-klaus/babel-plugin-sfcc-modules",
      {
        "basePath": "./cartridges",
        "cartridgePath": ["app_custom", "app_storefront_base"]
      }
    ]
  ]
}
```

Use this package for Babel-based pipelines. For Vite and Vitest, use [`@commerce-klaus/vite-plugin-sfcc-modules`](https://commerce-klaus.github.io/commerce-klaus/packages/vite-plugin-sfcc-modules/).

## Documentation

See the [complete configuration and resolution reference](https://commerce-klaus.github.io/commerce-klaus/packages/babel-plugin-sfcc-modules/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/babel-plugin-sfcc-modules
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/babel-plugin-sfcc-modules
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/babel-plugin-sfcc-modules
