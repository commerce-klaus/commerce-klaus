# @commerce-klaus/sfcc-runner

Run cartridge modules on Node.js using the [SFCC script runtime](/guide/sfcc-script-runtime), without Vitest, Vite configuration, or a separately configured module loader. This package is intended for exceptional, specialized tooling—not normal application execution.

## When to use it

The runner's purpose is to let a Node.js tool execute existing SFCC cartridge code so you do not have to copy and maintain the same business logic a second time. A suitable exception might be a local order-export converter that uses a cartridge mapping to generate payloads or test fixtures.

::: warning Use only for exceptional Node.js workflows

Most projects should not need this package. Do not use it as the normal way to run application code or as a substitute for SFCC integration testing. Node.js is not the SFCC script runtime, and this runner does not emulate the complete platform. For routine cartridge tests, use [`@commerce-klaus/vitest-sfcc`](../vitest-sfcc/); for production execution, use SFCC.

:::

If the logic can be cleanly shared outside the SFCC runtime, prefer extracting a runtime-neutral module. Use the runner when the specialized Node.js tool needs to execute cartridge-bound logic without a duplicate implementation.

## Installation

::: code-group

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

:::

## Create a runner

The runner discovers `commerce-klaus.config.ts` or `commerce-klaus.config.js` from `cwd` by default. It uses project-wide cartridge settings, including `cartridgesDir`, `cartridgePath`, `siteTemplatePath`, and `site`. Per-run options override those settings:

```ts
import { createSfccRunner } from "@commerce-klaus/sfcc-runner"

const runner = createSfccRunner({
  cwd: process.cwd(),
  site: "ExampleSite",
  runtime: {
    site: {
      id: "ExampleSite",
      preferences: { taxClass: "standard" },
    },
    globals: {
      request: { locale: "en_US" },
      session: { custom: { taxToken: "test-token" } },
    },
  },
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

Pass `cartridgePath` to override the configured cartridge order. If no order is supplied, the shared resolver uses its normal precedence across project config, environment, solution references, site metadata, and filesystem fallback. Set `configFile: false` to disable project config discovery. `cwd` defaults to the current working directory; `basePath` and all other resolution options use the shared [`ModuleResolutionOptions`](../sfcc-module-resolver/) contract.

The runner's `site` option selects project configuration, such as a site's `site.xml`. The separate `runtime.site` option configures the `dw/system/Site` implementation, and `runtime.globals` supplies SFCC globals.

The runner uses the shared module resolver and supports `~/`, `*/`, cartridge aliases, relative `require()` calls, and `module.superModule`.

Use `load<Exports>()` to supply project-specific module declarations. Its default return type is `unknown`. `invoke<Arguments, Result>(moduleId, exportName, ...args)` calls a named export; use `"default"` for a module that directly exports a function.

## Mock dependencies

Register mocks before loading any module. Mocks apply to SFCC platform modules and cartridge or Node.js dependencies:

```ts
runner.mock("dw/system/Logger", {
  info: (message: string) => console.log(message),
})
runner.mock("*/cartridge/scripts/tax/provider", {
  getTaxRate: () => 0.2,
})

const mapping = runner.load<{ calculate(amount: number): number }>(
  "app_custom/cartridge/scripts/tax/mapping",
)
```

`mockResolved(filePath, implementation)` targets one exact resolved file. Registering additional mocks after loading starts is rejected because already evaluated modules may have captured the previous dependency.

The runner reuses the focused `dw/*` implementations from [`@commerce-klaus/sfcc-test-runtime`](../sfcc-test-runtime/). A platform API without a focused implementation must be mocked explicitly. Missing modules fail with a diagnostic; there is no success-shaped fallback.

Calls to the default `dw/system/Logger` implementation are captured as structured entries on `runner.loggerEntries` and written to the console by default: `debug` uses `console.log`, `info` uses `console.info`, `warn` uses `console.warn`, and `error`/`fatal` use `console.error`. The entries remain available after `close()`, so a Node.js tool can report warnings and errors after cleanup.

Set `runtime.onLoggerEntry` to `false` to disable console forwarding, or provide a callback to replace the default output with custom routing to `stdout`, `stderr`, another writable stream, or a logger:

```ts
const runner = createSfccRunner({
  runtime: {
    onLoggerEntry(entry) {
      const write =
        entry.level === "warn" || entry.level === "error" || entry.level === "fatal"
          ? console.error
          : console.log
      write(entry.message, ...entry.parameters)
    },
  },
})
```

The callback runs in addition to capturing entries. Exceptions from it propagate to the cartridge code that made the Logger call. If you mock `dw/system/Logger`, the mock replaces the default capturing and console-forwarding implementation.

## Module behavior and lifecycle

- Cartridge modules execute as CommonJS. `module.exports`, nested and function-local `require()`, and per-run module caching are supported.
- The shared resolver determines cartridge precedence and the next `module.superModule`.
- `.js`, `.ds`, and `.json` files are supported. Dynamic `import()` in a CommonJS cartridge module is reported as unsupported.
- Node.js package dependencies use Node's normal resolution when they are not mocked.
- Close the runner in `finally`. `close()` is idempotent, clears the runner's module cache, restores globals, and releases the process-wide runner slot even after a load or invocation throws.
- Because SFCC globals are process-wide, only one runner may be open at a time. Close it before creating another runner with a different site or global context.

::: warning Node.js execution boundary

The runner executes trusted cartridge code inside the current Node.js process. It is not a security sandbox and does not emulate the complete SFCC platform or runtime.

:::

## API types

`createSfccRunner(options)` returns `SfccRunner`. Its options extend the shared resolver settings and accept optional `runtime` settings. Public types include `SfccRunnerOptions`, `SfccRunner`, `SfccModule`, `LoggerEntry`, `SfccGlobals`, and `SfccTestRuntimeOptions`.

<!--@include: ../../_partials/package-development.md-->
