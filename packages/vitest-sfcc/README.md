[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/vitest-sfcc

Cartridge-aware SFCC runtime and dependency mocking for Vitest.

## Highlights

- Resolves `dw/*`, `*/`, `~/`, cartridge aliases, relative modules, and `module.superModule`
- Infers cartridge order from configuration, environment, `jsconfig`, or `site.xml`
- Provides focused SFCC runtime modules, globals, controllers, hooks, and job steps
- Replaces module dependencies without `proxyquire`
- Exposes runtime APIs and types through `@commerce-klaus/vitest-sfcc/runtime`

## When to use this package

Use this package when cartridge code must run in Vitest. It includes SFCC module
resolution, CommonJS transformation, platform-module fallbacks, dependency
mocking, and test harnesses.

Use
[`@commerce-klaus/vite-plugin-sfcc-modules`](https://commerce-klaus.github.io/commerce-klaus/packages/vite-plugin-sfcc-modules/)
only when another Vite-based tool needs cartridge-aware module resolution without
the test runtime. You do not need to install or configure that plugin alongside
`vitest-sfcc`.

## Install

```bash [pnpm]
pnpm add -D @commerce-klaus/vitest-sfcc vitest
```

```bash [yarn]
yarn add -D @commerce-klaus/vitest-sfcc vitest
```

```bash [npm]
npm install -D @commerce-klaus/vitest-sfcc vitest
```

```bash [Vite+]
vp install -D @commerce-klaus/vitest-sfcc vitest
```

## Usage

```ts
import { defineConfig } from "vite-plus"
import sfccVitest from "@commerce-klaus/vitest-sfcc"

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: "./cartridges",
      cartridgePath: ["app_custom", "app_storefront_base"],
    }),
  ],
})
```

Register a dependency replacement before dynamically importing the subject:

```ts
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc"

getSfccRuntime().mock("*/cartridge/scripts/provider", providerMock)
const subject = await import("../cartridge/scripts/subject.js")
```

Runtime-only APIs and types are also available from the lightweight subpath:

```ts
import { resetSfccRuntime, type SfccModule } from "@commerce-klaus/vitest-sfcc/runtime"
```

Consumer projects only need to install `@commerce-klaus/vitest-sfcc`; its
framework-independent runtime remains an internal dependency.

## Documentation

See the [complete configuration and testing reference](https://commerce-klaus.github.io/commerce-klaus/packages/vitest-sfcc/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/vitest-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/vitest-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/vitest-sfcc
