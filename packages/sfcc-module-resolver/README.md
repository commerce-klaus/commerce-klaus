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

`ModuleResolutionOptions` is the shared configuration type used by the Vite
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
import {
  createModuleResolver,
  inferCartridgeOrder,
} from "@commerce-klaus/sfcc-module-resolver/resolution"

const cartridgeRoots = inferCartridgeOrder({ cartridgesDir: "cartridges" })
const resolveSfccModule = createModuleResolver(cartridgeRoots)
```

The package provides focused entry points for `resolution`, `hooks`, `job-steps`,
`custom-apis`, and project-wide validation and graphs under `project`. The package
root contains the resolution API only.

## Documentation

See the [complete API and resolution reference](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-module-resolver/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-module-resolver
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-module-resolver
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-module-resolver
