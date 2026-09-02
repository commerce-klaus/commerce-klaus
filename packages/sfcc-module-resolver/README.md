[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/sfcc-module-resolver

Shared Node.js utilities for SFCC cartridge order, module resolution, super modules, and hook registrations. Most projects use it indirectly through the Commerce Klaus ESLint, TypeScript, Vite, or Babel packages.

## Highlights

- Infers cartridge order from configuration, environment, `jsconfig`, or `site.xml`
- Resolves `*/`, `~/`, cartridge aliases, and `module.superModule`
- Provides deterministic filesystem helpers for SFCC-aware tooling
- Reads and resolves cartridge hook registrations
- Discovers effective hook scripts in cartridge-path order

## Install

```bash
pnpm add @commerce-klaus/sfcc-module-resolver
```

```ts
import { createSfccModuleResolver, inferCartridgeOrder } from "@commerce-klaus/sfcc-module-resolver"

const cartridgeRoots = inferCartridgeOrder({ cartridgesDir: "cartridges" })
const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
```

## Documentation

See the [complete API and resolution reference](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-module-resolver/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-module-resolver
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-module-resolver
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-module-resolver
