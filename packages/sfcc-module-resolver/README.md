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
- Builds deterministic project graphs for cartridge precedence, super modules, SFRA controller
  routes, effective middleware pipelines, and metadata contracts

`SfccModuleResolutionOptions` is the shared configuration type used by the Vite
and Vitest adapters. `ResolveCartridgeRootsOptions` extends it with the
resolver-only `containingFile` option.

Projects can put shared options in `commerce-klaus.config.ts` or
`commerce-klaus.config.js`. Package options remain supported and override the
central values. The public configuration contract lives in
`@commerce-klaus/config`; see the [project configuration guide](https://commerce-klaus.github.io/commerce-klaus/guide/project-configuration).

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
import {
  createSfccProjectGraph,
  diffSfccProjectGraphs,
  filterSfccProjectGraph,
} from "@commerce-klaus/sfcc-module-resolver"

const graph = createSfccProjectGraph({
  cartridgesDir: "cartridges",
  cartridgePath: ["app_custom", "app_storefront_base"],
})

const productRouteGraph = filterSfccProjectGraph(graph, {
  focus: "Product-Show",
  direction: "dependencies",
})

const comparisonGraph = createSfccProjectGraph({
  cartridgesDir: "cartridges",
  cartridgePath: ["app_campaign", "app_custom", "app_storefront_base"],
})
const graphDiff = diffSfccProjectGraphs(graph, comparisonGraph)
```

The graph links SFRA controllers to statically named `server.get()`,
`server.post()`, `server.prepend()`, `server.append()`, and `server.replace()`
routes. For inherited controllers, it also composes the effective middleware
pipeline in execution order, including replaced routes. Dynamic route names
are left out rather than guessed. Custom API nodes link to both their OpenAPI
schema and resolved implementation script, with the matching HTTP method and
path represented as the request entry point.
`filterSfccProjectGraph()` matches node IDs, labels, and paths
case-insensitively. It follows outgoing dependencies by default and supports
`dependents` or `both` traversal with an optional maximum depth.
`diffSfccProjectGraphs()` compares two deterministic graphs and reports added,
removed, and changed nodes and relationships while retaining both source
graphs for structured consumers.

## Documentation

See the [complete API and resolution reference](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-module-resolver/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-module-resolver
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-module-resolver
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-module-resolver
