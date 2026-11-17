[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/sfcc-runner

Most projects do not need this package. It is an exceptional-use bridge for specialized Node.js tools that must execute existing CommonJS cartridge code instead of duplicating its business logic, such as a local order-export converter that uses a cartridge mapping to generate payloads or fixtures. It is not a general application runtime or a substitute for SFCC.

## Installation

```bash [pnpm]
pnpm add -D @commerce-klaus/sfcc-runner
```

```bash [npm]
npm install -D @commerce-klaus/sfcc-runner
```

```bash [Yarn]
yarn add -D @commerce-klaus/sfcc-runner
```

```bash [Vite+]
vp install -D @commerce-klaus/sfcc-runner
```

## Quick start

```ts
import { createSfccRunner } from "@commerce-klaus/sfcc-runner"

const runner = createSfccRunner({
  basePath: "./cartridges",
  cartridgePath: ["app_custom", "app_storefront_base"],
  runtime: { site: { id: "ExampleStore", preferences: { taxClass: "standard" } } },
})

try {
  const mapping = runner.load<{ createPayload(): unknown }>(
    "app_custom/cartridge/scripts/Example-Mapping",
  )
  console.log(mapping.createPayload())
} finally {
  runner.close()
}
```

See the [complete runner guide](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-runner/) for mocks, globals, resolution, limitations, and API types.

Calls to the default `dw/system/Logger` implementation are written to the console by default and available as structured `runner.loggerEntries`, including after `close()`. Set `runtime.onLoggerEntry` to `false` to disable output or provide a callback to customize it.

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-runner
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-runner
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-runner
