[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/sfcc-module-resolver

Shared Node.js utilities for SFCC cartridge order, module resolution, super modules, and hook registrations. Most projects use it indirectly through the Commerce Klaus ESLint, TypeScript, Vite, or Babel packages.

## Highlights

- Infers cartridge order from configuration, environment, `jsconfig`, or `site.xml`
- Resolves `*/`, `~/`, cartridge aliases, and `module.superModule`
- Explains resolution with every attempted file path and the selected match
- Provides deterministic filesystem helpers for SFCC-aware tooling
- Reads and resolves cartridge hook registrations
- Discovers effective hook scripts in cartridge-path order
- Reads job step definitions, parameters, status codes, execution capabilities, and task timeouts from `steptypes.json`
- Validates hook, job step, and Custom API contracts with structured diagnostics
- Builds deterministic project graphs for cartridge precedence, super modules, and metadata contracts

`SfccModuleResolutionOptions` is the shared configuration type used by the Vite
and Vitest adapters. `ResolveCartridgeRootsOptions` extends it with the
resolver-only `containingFile` option.

## Install

```bash [pnpm]
pnpm add @commerce-klaus/sfcc-module-resolver
```

```bash [yarn]
yarn add @commerce-klaus/sfcc-module-resolver
```

```bash [npm]
npm install @commerce-klaus/sfcc-module-resolver
```

```bash [Vite+]
vp install @commerce-klaus/sfcc-module-resolver
```

```ts
import { createSfccModuleResolver, inferCartridgeOrder } from "@commerce-klaus/sfcc-module-resolver"

const cartridgeRoots = inferCartridgeOrder({ cartridgesDir: "cartridges" })
const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
```

Inspect the exact lookup path without changing resolution behavior:

```ts
import { explainSfccModuleResolution } from "@commerce-klaus/sfcc-module-resolver"

const trace = explainSfccModuleResolution(
  "*/cartridge/models/product",
  importingFile,
  cartridgeRoots,
)
```

Validate metadata contracts without changing the resolver's tolerant lookup
behavior:

```ts
import { validateSfccProject } from "@commerce-klaus/sfcc-module-resolver"

const result = validateSfccProject({
  cartridgesDir: "cartridges",
  cartridgeRoots,
})
```

Build a project relationship graph for JSON, text, or Graphviz consumers:

```ts
import { createSfccProjectGraph } from "@commerce-klaus/sfcc-module-resolver"

const graph = createSfccProjectGraph({
  cartridgesDir: "cartridges",
  cartridgePath: ["app_custom", "app_storefront_base"],
})
```

## Documentation

See the [complete API and resolution reference](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-module-resolver/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-module-resolver
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-module-resolver
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-module-resolver
