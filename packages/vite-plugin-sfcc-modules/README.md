[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/vite-plugin-sfcc-modules

Vite plugin for resolving Salesforce Commerce Cloud server-side module patterns in Vite and Vitest.

## Highlights

- Resolves `require("*/...")` by cartridge order
- Resolves `require("~/...")` in the current cartridge
- Resolves cartridge aliases and `module.superModule`
- Supports explicit and inferred cartridge paths

## When to use this package

Use this plugin when a Vite-based tool needs to resolve SFCC cartridge module
patterns as part of its module graph. It does not provide SFCC platform modules,
globals, dependency mocking, or controller and job-step harnesses.

For executing cartridge code in Vitest, use
[`@commerce-klaus/vitest-sfcc`](https://commerce-klaus.github.io/commerce-klaus/packages/vitest-sfcc/)
instead. It combines cartridge resolution with CommonJS transformation, an SFCC
test runtime, and dependency mocking. Do not configure both plugins for the same
Vitest run.

## Install

```bash
pnpm add -D @commerce-klaus/vite-plugin-sfcc-modules
```

```ts
import { defineConfig } from "vite"
import sfccModules from "@commerce-klaus/vite-plugin-sfcc-modules"

export default defineConfig({
  plugins: [
    sfccModules({
      basePath: "./cartridges",
      cartridgePath: ["app_custom", "app_storefront_base"],
    }),
  ],
})
```

## Documentation

See the [complete configuration and resolution reference](https://commerce-klaus.github.io/commerce-klaus/packages/vite-plugin-sfcc-modules/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/vite-plugin-sfcc-modules
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/vite-plugin-sfcc-modules
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/vite-plugin-sfcc-modules
