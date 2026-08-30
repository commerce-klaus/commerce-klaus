[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/eslint-config-sfcc

Shareable ESLint flat config for Salesforce Commerce Cloud projects. It catches Rhino compatibility problems and SFCC-specific mistakes before code reaches a sandbox.

## Highlights

- Detects unsupported syntax and standard library APIs
- Checks SFCC module paths, hooks, and Custom API exports
- Handles Rhino-specific `const` and scoping behavior
- Includes SFCC and SiteGenesis rules
- Supports ESLint and an Oxlint-compatible preset

## Install

```bash
pnpm add -D eslint @commerce-klaus/eslint-config-sfcc
```

```js
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(sfcc.configs.recommended)
```

The recommended config checks server-side JavaScript below `cartridges/` and excludes client-side and static asset folders.

It also disables selected incompatible rules from ESLint core/recommended, `eslint-plugin-unicorn`, `typescript-eslint`, and `eslint-plugin-sonarjs`. This keeps those presets usable alongside SFCC code without suggesting unsupported Rhino syntax, APIs, or module patterns. See the configuration guide for the documented compatibility overrides.

## Documentation

See the [complete configuration guide and rule reference](https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/eslint-config-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/eslint-config-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/eslint-config-sfcc
