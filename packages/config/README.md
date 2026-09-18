[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/config

Shared project configuration for Commerce Klaus tools.

## Install

```bash
pnpm add -D @commerce-klaus/config
```

```bash
yarn add -D @commerce-klaus/config
```

```bash
npm install -D @commerce-klaus/config
```

```bash
vp install -D @commerce-klaus/config
```

## Usage

Create `commerce-klaus.config.ts` or `commerce-klaus.config.js` in the project
root:

```ts
import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgesDir: "cartridges",
  solutionConfigPath: "cartridges/jsconfig.json",
  siteTemplatePath: "sites/site_template",
  site: "RefArch",
})
```

Paths are resolved relative to the configuration file. Explicit package options
and CLI flags override matching central values.

## Documentation

See the [project configuration guide](https://commerce-klaus.github.io/commerce-klaus/guide/project-configuration).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/config
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/config
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/config
