[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/vite-plugin-sfcc-modules

A Vite plugin that resolves Salesforce Commerce Cloud (SFCC) server-side module patterns.

This package continues `vite-plugin-sfcc-modules` under the Commerce-Klaus organization.
It originates from `@commerce-klaus/babel-plugin-sfcc-modules` and is the port to a modern Vite ecosystem. The goal is the same DX for SFCC module resolution, but natively in Vite/Vitest without a Babel runtime layer.

## TL;DR

```ts
import sfccModules from "@commerce-klaus/vite-plugin-sfcc-modules"

export default defineConfig({
  plugins: [
    sfccModules({
      cartridgePath: ["app_brand", "app_core", "app_storefront_base"],
      basePath: "./cartridges",
    }),
  ],
})
```

```js
// resolves first match in cartridge path
const foo = require("*/cartridge/scripts/foo")

// resolves inside the caller's own cartridge
const bar = require("~/cartridge/scripts/bar")

// resolves to next cartridge in path — rewritten to a static import
const base = module.superModule
```

## Why this plugin exists

SFCC projects often use module patterns that are not standard Node.js resolution:

- `require("*/cartridge/scripts/foo")`
- `require("~/cartridge/scripts/bar")`
- `module.superModule`

This plugin resolves those patterns according to cartridge path order and rewrites source code so Vite can process the full module graph.

## Features

- Resolves `require("*/...")` against the configured cartridge path in order.
- Resolves `require("~/...")` against the caller's own cartridge.
- Resolves `module.superModule` to the next cartridge implementation.
- Supports `.js`, `.ds`, and `.json` file extensions.
- Works in Vite and Vitest pipelines.

## Installation

```bash
pnpm add -D @commerce-klaus/vite-plugin-sfcc-modules
```

or

```bash
npm i -D @commerce-klaus/vite-plugin-sfcc-modules
```

or

```bash
yarn add -D @commerce-klaus/vite-plugin-sfcc-modules
```

## Usage

Add the plugin to your Vite config:

```ts
import { defineConfig } from "vite"
import sfccModules from "@commerce-klaus/vite-plugin-sfcc-modules"

export default defineConfig({
  plugins: [
    sfccModules({
      cartridgePath: ["app_brand", "app_core", "app_storefront_base"],
      basePath: "./cartridges",
    }),
  ],
})
```

### Options

| Option          | Type       | Required | Description                                                                                        |
| --------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| `cartridgePath` | `string[]` | yes      | Ordered cartridge lookup path. First match wins.                                                   |
| `basePath`      | `string`   | yes      | Path to the folder containing cartridges in `cartridgePath`. Resolved relative to `process.cwd()`. |

## Resolution behavior

### 1. `require("*/...")`

Searches all cartridges in `cartridgePath` order and picks the first matching file.

### 2. `require("~/...")`

Resolves only in the current file's cartridge.

### 3. `module.superModule`

Resolves to the next matching module in cartridge path order after the current cartridge.

Important: `module.superModule` is rewritten to a static `import`, not a runtime `require()`. This is intentional so Vite can transform transitive super-module chains as part of the normal module graph.

## Vite + Vitest notes

- Use the plugin in the top-level `plugins` array of `vite.config.ts`.
- Do not rely on test-only plugin wiring that skips transitive transforms.
- In tests, prefer static `import` over `createRequire`, since `createRequire` bypasses Vite transforms.

## Relationship to @commerce-klaus/babel-plugin-sfcc-modules

| Topic                | `@commerce-klaus/babel-plugin-sfcc-modules` | `@commerce-klaus/vite-plugin-sfcc-modules` |
| -------------------- | ------------------------------------------- | ------------------------------------------ |
| Transformation layer | Babel                                       | Vite transform pipeline                    |
| Runtime setup        | Often Babel tooling / register              | Native Vite/Vitest                         |
| Main use case        | Babel-based SFCC toolchains                 | Modern Vite-based SFCC toolchains          |

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

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/vite-olugin-sfcc-modules
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/vite-olugin-sfcc-modules
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/vite-olugin-sfcc-modules
