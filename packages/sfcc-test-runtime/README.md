[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/sfcc-test-runtime

Framework-independent SFCC runtime modules and dependency mocking for local tests.

## Highlights

- Replaces module identifiers globally or one exact resolved file
- Installs and restores controlled SFCC globals
- Provides focused `dw/system` and `dw/util` test implementations
- Executes SFRA controllers, hooks, script-module job steps, and chunk jobs
- Remains independent of Vite, Vitest, cartridge paths, and site-template files

## Install

```bash [pnpm]
pnpm add -D @commerce-klaus/sfcc-test-runtime
```

```bash [yarn]
yarn add -D @commerce-klaus/sfcc-test-runtime
```

```bash [npm]
npm install -D @commerce-klaus/sfcc-test-runtime
```

```bash [Vite+]
vp install -D @commerce-klaus/sfcc-test-runtime
```

Most Vitest projects should install `@commerce-klaus/vitest-sfcc` instead and use `@commerce-klaus/vitest-sfcc/runtime` for runtime-only APIs and types.

## Usage

```ts
import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"

const runtime = createSfccTestRuntime({
  site: { id: "RefArch" },
})

runtime.mock("dw/system/Logger", loggerMock)
runtime.setGlobals({ request, session, customer })
```

Use `@commerce-klaus/vitest-sfcc` to connect the runtime to cartridge modules
in Vitest. The standalone package is intended for test-framework integrations
and focused runtime tests.

## Documentation

See the [complete runtime and harness reference](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-test-runtime/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-test-runtime
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-test-runtime
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-test-runtime
