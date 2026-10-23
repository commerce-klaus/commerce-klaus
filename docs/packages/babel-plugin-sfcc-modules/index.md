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

## Shared resolution model

<!--@include: ../../_partials/sfcc-module-resolution.md-->

<!--@include: ../../_partials/sfcc-module-resolution-guide-link.md-->

<!--@include: ../../_partials/project-configuration.md-->

## Why this plugin exists

This plugin rewrites SFCC module patterns to relative require paths that Node.js can load, without requiring additional runtime shims.

## Features

- Resolves `require("*/...")` against cartridge order.
- Resolves `require("~/...")` against the caller's own cartridge.
- Resolves `module.superModule` to the next matching cartridge implementation.
- Supports cartridge order via explicit `cartridgePath` or inferred order fallback.
- Designed for Babel-based test/tooling pipelines.

## Installation

This plugin supports Babel 7 and 8 and declares `@babel/core` and `@babel/types` as peer dependencies. Install matching compatible Babel packages in your project.

::: code-group

```sh [pnpm]
pnpm add -D @commerce-klaus/babel-plugin-sfcc-modules
```

```sh [npm]
npm install -D @commerce-klaus/babel-plugin-sfcc-modules
```

```sh [Yarn]
yarn add -D @commerce-klaus/babel-plugin-sfcc-modules
```

```sh [Vite+]
vp install -D @commerce-klaus/babel-plugin-sfcc-modules
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

| Option               | Type              | Description                                                                 |
| -------------------- | ----------------- | --------------------------------------------------------------------------- |
| `cartridgePath`      | `Array`           | ordered cartridge path used for lookup (optional)                           |
| `basePath`           | `string`          | cartridge directory override; defaults to central config, then `cartridges` |
| `cwd`                | `string`          | working directory used to resolve relative paths                            |
| `siteTemplatePath`   | `string`          | path to the site-template root containing `sites/<site>/site.xml`           |
| `site`               | `string`          | site id used to read `custom-cartridges` from `site.xml`                    |
| `solutionConfigPath` | `string`          | path to `cartridges/jsconfig.json` used for reference-based cartridge order |
| `envCartridgePath`   | `string`          | colon-separated cartridge order override (same as `SFCC_CARTRIDGE_PATH`)    |
| `configFile`         | `string \| false` | explicit central config path, or `false` to disable discovery               |

<!--@include: ../../_partials/cartridge-order-inference.md-->

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

::: warning Frontend bundles are unsupported

![kitten.png](https://github.com/jenssimon/babel-plugin-sfcc-modules/raw/main/kitten.png)

Do not use this plugin for frontend bundles. Frontend build tools provide better ways to handle aliases, package lookup, and assets; SFRA projects can use the asset handling in [sgmf-scripts](https://www.npmjs.com/package/sgmf-scripts).

The cartridge path is a server-side SFCC concept. The plugin may transform frontend code, but that use is not supported. Prefer explicit aliases in the frontend bundler.

:::

<!--@include: ../../_partials/package-development.md-->

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/babel-plugin-sfcc-modules
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/babel-plugin-sfcc-modules
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/babel-plugin-sfcc-modules
