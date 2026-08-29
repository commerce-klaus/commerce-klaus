[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/vite-plugin-sfcc-modules

Vite plugin for resolving Salesforce Commerce Cloud server-side module patterns in Vite and Vitest.

## Highlights

- Resolves `require("*/...")` by cartridge order
- Resolves `require("~/...")` in the current cartridge
- Resolves cartridge aliases and `module.superModule`
- Supports explicit and inferred cartridge paths

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
