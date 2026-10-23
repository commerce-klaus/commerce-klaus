[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/config

Shared project configuration for Commerce Klaus tools.

## Installation

::: code-group

```bash [pnpm]
pnpm add -D @commerce-klaus/config
```

```bash [npm]
npm install -D @commerce-klaus/config
```

```bash [Yarn]
yarn add -D @commerce-klaus/config
```

```bash [Vite+]
vp install -D @commerce-klaus/config
```

:::

## Usage

```ts [commerce-klaus.config.ts]
import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgesDir: "cartridges",
  solutionConfigPath: "cartridges/jsconfig.json",
  siteTemplatePath: "sites/site_template",
  site: "RefArch",
})
```

See the [project configuration guide](/guide/project-configuration) for option
precedence and all supported fields.

## API

- `defineConfig(config): CommerceKlausConfig`
- `findCommerceKlausConfig(startDirectory?): string | undefined`
- `loadCommerceKlausConfig(options?): LoadedCommerceKlausConfig`
- `resolveCommerceKlausConfig(options?): CommerceKlausConfig`
- `normalizeCartridgeArchitectureAssignments(assignments)`
  - Normalizes names and rejects unknown roles or cartridges assigned to multiple roles.
- `filterCartridgePathByArchitecture(cartridgePath, assignments, selection): string[]`
  - Selects architecture-assigned, explicitly included, or optionally unassigned cartridges.
  - Preserves the original cartridge-path order exactly.

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/config
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/config
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/config
