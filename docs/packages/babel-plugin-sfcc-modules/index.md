[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/babel-plugin-sfcc-modules

A Babel plugin that resolves Salesforce Commerce Cloud (SFCC) server-side module patterns for Babel-based runtimes and tests.

This package continues the original `babel-plugin-sfcc-modules` under the Commerce Klaus organization.

## TL;DR

```json{3-8} [.babelrc]
{
  "plugins": [
    [
      "@commerce-klaus/babel-plugin-sfcc-modules",
      {
        "cartridgePath": ["app_brand", "app_core", "app_storefront_base"],
        "basePath": "./cartridges"
      }
    ]
  ]
}
```

Server-side code for Salesforce Commerce Cloud uses non-standard module resolution patterns:

- first matching cartridge from cartridge path

```javascript
require("*/cartridge/scripts/foo")
```

- current cartridge

```javascript
require("~/cartridge/scripts/bar")
```

also a non-standard extension

```javascript
module.superModule
```

to reference the next match in cartridge path for the current module.

## Why this plugin exists

Node.js does not resolve SFCC cartridge semantics by default. This is typically a problem when running server-side SFCC code in local Node.js unit tests or Babel-driven tooling.

This plugin rewrites SFCC module patterns to relative require paths that Node.js can load, without requiring additional runtime shims.

## Features

- Resolves `require("*/...")` against cartridge order.
- Resolves `require("~/...")` against the caller's own cartridge.
- Resolves `module.superModule` to the next matching cartridge implementation.
- Supports cartridge order via explicit `cartridgePath` or inferred order fallback.
- Designed for Babel-based test/tooling pipelines.

## Installation

::: code-group

```sh [pnpm]
pnpm add -D @commerce-klaus/babel-plugin-sfcc-modules
```

```sh [yarn]
yarn add -D @commerce-klaus/babel-plugin-sfcc-modules
```

```sh [npm]
npm install -D @commerce-klaus/babel-plugin-sfcc-modules
```

:::

## Usage

Add to your Babel configuration:

```json{2-9} [.babelrc]
"plugins": [
  ["@commerce-klaus/babel-plugin-sfcc-modules", {
    "cartridgePath": [
      "app_brand",
      "app_core",
      "app_storefront_base"
    ],
    "basePath": "./cartridges"
  }]
]
```

Example with cartridge order inferred from `site.xml` (`custom-cartridges`):

```json{2-6} [.babelrc]
"plugins": [
  ["@commerce-klaus/babel-plugin-sfcc-modules", {
    "basePath": "./cartridges",
    "siteTemplatePath": "./sites/site_template",
    "site": "RefArch"
  }]
]
```

Example with explicit env-style override (`envCartridgePath`):

```json{2-5} [.babelrc]
"plugins": [
  ["@commerce-klaus/babel-plugin-sfcc-modules", {
    "basePath": "./cartridges",
    "envCartridgePath": "app_brand:app_core:app_storefront_base"
  }]
]
```

## Options

| Option               | Type     | Description                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `cartridgePath`      | `Array`  | ordered cartridge path used for lookup (optional)                           |
| `basePath`           | `string` | path to the cartridges directory                                            |
| `cwd`                | `string` | working directory used to resolve relative paths                            |
| `siteTemplatePath`   | `string` | path to the site-template root containing `sites/<site>/site.xml`           |
| `site`               | `string` | site id used to read `custom-cartridges` from `site.xml`                    |
| `solutionConfigPath` | `string` | path to `cartridges/jsconfig.json` used for reference-based cartridge order |
| `envCartridgePath`   | `string` | colon-separated cartridge order override (same as `SFCC_CARTRIDGE_PATH`)    |

If `cartridgePath` is omitted, cartridge order is inferred with this precedence:

1. `envCartridgePath` (or `SFCC_CARTRIDGE_PATH`)
2. `solutionConfigPath` references
3. `siteTemplatePath` + `site` (`custom-cartridges` in `site.xml`)
4. filesystem fallback (alphabetical)

## Resolution behavior

### 1. `require("*/...")`

Searches all cartridges in order and rewrites to the first matching file as a relative require path.

### 2. `require("~/...")`

Resolves only in the current file's cartridge and rewrites to a relative require path.

### 3. `module.superModule`

Resolves to the next matching module in cartridge order and rewrites to `require("<relative>")`.

If no fallback cartridge module exists, it is rewritten to `undefined`.

## Babel notes

- Use the plugin in your Babel `plugins` array for test/runtime transforms.
- The plugin rewrites import-like patterns in transformed source; it does not alter SFCC runtime behavior itself.
- For non-test frontend bundles, prefer native bundler alias mechanisms where possible.

## Relationship to @commerce-klaus/vite-plugin-sfcc-modules

| Topic                | `@commerce-klaus/babel-plugin-sfcc-modules` | `@commerce-klaus/vite-plugin-sfcc-modules` |
| -------------------- | ------------------------------------------- | ------------------------------------------ |
| Transformation layer | Babel                                       | Vite transform pipeline                    |
| Runtime setup        | Babel-driven test/tooling runtime           | Native Vite/Vitest                         |
| Main use case        | Existing Babel-based SFCC workflows         | Modern Vite-based SFCC workflows           |

## Warning

![kitten.png](https://github.com/jenssimon/babel-plugin-sfcc-modules/raw/main/kitten.png)

You shouldn't use it for frontend code. There are better alternatives to deal with a cartridge path, [NODE_PATH](https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders) and the handling of frontend assets in [sgmf-scripts](https://www.npmjs.com/package/sgmf-scripts).

In my opinion the best way to handle frontend code is to have a clean configuration of Webpack aliases.

The cartridge path concept isn't common for Node.js/frontend code. This plugin will work for it but I won't officially support it.

## Development

This repository uses Vite+ (`vp`):

```bash
vp install
vp check
vp test
vp run build
```

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/babel-plugin-sfcc-modules
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/babel-plugin-sfcc-modules
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/babel-plugin-sfcc-modules
