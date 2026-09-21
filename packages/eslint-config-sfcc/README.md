[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/eslint-config-sfcc

Shareable ESLint flat config for Salesforce Commerce Cloud projects. It catches Rhino compatibility problems and SFCC-specific mistakes before code reaches a sandbox.

## Highlights

- Detects unsupported syntax and standard library APIs
- Checks SFCC module paths, hooks, and Custom API exports
- Handles Rhino-specific `const` and scoping behavior
- Includes SFCC and SiteGenesis rules
- Provides Storefront Next, PWA, SFRA, and SiteGenesis policy presets
- Provides additive presets for older SFCC compatibility modes
- Provides an opt-in preset for enforcing generated project types at metadata boundaries
- Supports ESLint and an Oxlint-compatible preset

## Install

```bash [pnpm]
pnpm add -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [yarn]
yarn add -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [npm]
npm install -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [Vite+]
vp install -D eslint @commerce-klaus/eslint-config-sfcc
```

```js
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(sfcc.configs.recommended)
```

Projects that generate declarations with `@commerce-klaus/typescript-sfcc` can add the
`generated-types` preset after `recommended`:

```js
export default defineConfig(sfcc.configs.recommended, sfcc.configs["generated-types"])
```

The preset checks registered job step functions, SFCC system hook implementations, Custom API handlers, and local Custom API success response values against their generated types.

The recommended config checks server-side JavaScript below `cartridges/` and excludes client-side and static asset folders.
It also disables Node.js and browser globals inherited from earlier flat config entries while keeping CommonJS and SFCC runtime globals available.

It also disables selected incompatible rules from ESLint core/recommended, `eslint-plugin-unicorn`, `typescript-eslint`, and `eslint-plugin-sonarjs`. This keeps those presets usable alongside SFCC code without suggesting unsupported Rhino syntax, APIs, or module patterns. See the configuration guide for the documented compatibility overrides.

The recommended config follows the current SFCC Script API. Projects using an older
compatibility mode can add the corresponding preset after `recommended`:

```js
export default defineConfig(sfcc.configs.recommended, sfcc.configs["compatibility-21.2"])
```

Presets are available for compatibility modes `21.2` and `22.7`. The `22.7` preset
currently matches the recommended API baseline and establishes an explicit version
contract for future Script API additions. The `21.2` preset also prevents Unicorn
from suggesting BigInt, `globalThis`, or `Object.fromEntries` as replacements.

## Documentation

See the [complete configuration guide and rule reference](https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/eslint-config-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/eslint-config-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/eslint-config-sfcc
