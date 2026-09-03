# @commerce-klaus/vitest-sfcc

[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

Cartridge-aware SFCC runtime and dependency mocking for Vitest. It provides a modern alternative to `proxyquire` for statically analyzable cartridge modules.

::: warning Pre-1.0 package
This package is currently published as a `0.x` release. Its API is usable but not yet considered stable; minor releases may contain breaking changes until `1.0.0`. Review the changelog when upgrading.
:::

## TL;DR

```ts{2,5-9} [vitest.config.ts]
import { defineConfig } from "vitest/config"
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

```ts [payment.test.ts]
import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"

const runtime = resetSfccRuntime()
runtime.mock("*/cartridge/scripts/payment/provider", providerMock)

const payment = await import("../cartridge/scripts/payment.js")
```

## Why this package exists

SFCC cartridge code uses CommonJS, cartridge-specific module identifiers, platform modules, globals, hooks, controllers, and job metadata that Vitest cannot execute by itself. This package connects the shared cartridge resolver and framework-independent test runtime to Vite's module graph so tests can load real cartridge modules and replace only their external dependencies.

## Features

- Resolves `dw/*`, `*/`, `~/`, cartridge aliases, relative modules, and `module.superModule`.
- Infers cartridge order from explicit configuration, environment, `jsconfig`, or `site.xml`.
- Provides focused SFCC runtime modules, globals, SFRA controller execution, hooks, and job steps.
- Supports specifier mocks and exact resolved-file mocks without `proxyquire`.
- Loads CommonJS cartridge modules through the normal Vite and Vitest pipeline.
- Exposes runtime-only APIs and types through `@commerce-klaus/vitest-sfcc/runtime`.

## Installation

::: code-group

```bash [pnpm]
pnpm add -D @commerce-klaus/vitest-sfcc vitest
```

```bash [yarn]
yarn add -D @commerce-klaus/vitest-sfcc vitest
```

```bash [npm]
npm install -D @commerce-klaus/vitest-sfcc vitest
```

:::

Do not install `@commerce-klaus/sfcc-test-runtime` separately when using the Vitest integration. It is an internal dependency and its public APIs are re-exported through `@commerce-klaus/vitest-sfcc/runtime`.

## Configuration

```ts
import { defineConfig } from "vite-plus"
import sfccVitest from "@commerce-klaus/vitest-sfcc"

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: "./cartridges",
      cartridgePath: ["app_custom", "app_storefront_base"],
      runtime: {
        site: { id: "RefArch" },
      },
    }),
  ],
})
```

The cartridge order can also be read from a site template:

```ts{5-7} [vitest.config.ts]
sfccVitest({
  basePath: "./cartridges",
  siteTemplatePath: "./sites/site_template",
  site: "RefArch",
})
```

This reads `sites/<site>/site.xml` below `siteTemplatePath` and uses its `custom-cartridges` value.

### Options

| Option               | Type                     | Required | Description                                                                    |
| -------------------- | ------------------------ | -------- | ------------------------------------------------------------------------------ |
| `basePath`           | `string`                 | yes      | Directory containing the project cartridges.                                   |
| `cartridgePath`      | `string[]`               | no       | Explicit cartridge order. First match wins.                                    |
| `cwd`                | `string`                 | no       | Working directory used to resolve relative paths. Defaults to `process.cwd()`. |
| `siteTemplatePath`   | `string`                 | no       | Site-template root containing `sites/<site>/site.xml`.                         |
| `site`               | `string`                 | no       | Site identifier used to read `custom-cartridges` from `site.xml`.              |
| `solutionConfigPath` | `string`                 | no       | Path to `cartridges/jsconfig.json` for reference-based cartridge order.        |
| `envCartridgePath`   | `string`                 | no       | Colon-separated cartridge order, matching `SFCC_CARTRIDGE_PATH`.               |
| `runtime`            | `SfccTestRuntimeOptions` | no       | Initial runtime options, including the current site id and custom preferences. |

If `cartridgePath` is omitted, order is inferred with this precedence:

1. `envCartridgePath` or `SFCC_CARTRIDGE_PATH`
2. references from `solutionConfigPath` or `cartridges/jsconfig.json`
3. `custom-cartridges` from `siteTemplatePath` and `site`
4. alphabetical filesystem fallback

The same inference rules are shared by the other Commerce Klaus packages through [`@commerce-klaus/sfcc-module-resolver`](../sfcc-module-resolver/).

## Runtime API

Application tests can import the common helpers from the package root. Tooling integrations and tests that only need runtime APIs or types can use the lightweight subpath:

```ts
import {
  getSfccRuntime,
  resetSfccRuntime,
  type SfccModule,
} from "@commerce-klaus/vitest-sfcc/runtime"
```

Both entry points address the same active runtime. `resetSfccRuntime()` creates and activates a fresh instance; `getSfccRuntime()` returns the active instance.

## Dependency mocking

Register replacements before dynamically importing the module under test:

```ts
import { beforeEach, expect, it, vi } from "vitest"
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc"

beforeEach(() => {
  vi.resetModules()
  getSfccRuntime().reset()
})

it("uses the test payment provider", async () => {
  getSfccRuntime().mock("*/cartridge/scripts/payment/provider", {
    authorize: () => ({ authorized: true }),
  })

  const payment = await import("../cartridge/scripts/payment.js")
  expect(payment.default.authorizePayment().authorized).toBe(true)
})
```

Mocks can target `dw/*`, `*/`, `~/`, and cartridge-alias module identifiers. Without a cartridge mock, the real file selected by cartridge resolution is loaded.

Static relative imports are mockable as well, covering a common `proxyquire` pattern:

```ts
getSfccRuntime().mock("./helpers/storeOpeningHours", storeOpeningHoursMock)
const storesHook = await import("../cartridge/scripts/hooks/stores.js")
```

A relative identifier can occur below multiple directories. Use an absolute resolved mock to replace exactly one file:

```ts
getSfccRuntime().mockResolved(
  "/workspace/cartridges/app_custom/cartridge/scripts/helpers/storeOpeningHours.js",
  storeOpeningHoursMock,
)
```

Resolved mocks take precedence over module-identifier mocks. `runtime.reset()` clears both kinds.

## SFCC globals

Cartridge code can access controlled SFCC globals without imports:

```ts
getSfccRuntime().setGlobals({
  customer: { authenticated: true },
  request: { locale: "de_DE", querystring: {} },
  session: { custom: {} },
})
```

The SFCC `empty()` global is installed automatically and covers nullish values, empty strings and arrays, and SFCC collections through `isEmpty()`. It can still be replaced through `setGlobals()` for a specific test.

`runtime.reset()` removes added globals, restores values that existed before the test, and reinstalls the default `empty()`. Use it in `afterEach` as well as test setup to prevent the final test in a worker from leaking context.

## SFRA controllers

The plugin resolves `require("server")` to the runtime's SFRA test server. Import a controller after resetting modules, then execute one of its exported routes:

```ts
const controller = await import("../cartridge/controllers/Checkout.js")
const response = await getSfccRuntime()
  .controller(controller.default)
  .run("Begin", {
    querystring: { stage: "shipping" },
  })

expect(response.view).toBe("checkout/checkout")
expect(response.viewData).toMatchObject({ currentStage: "shipping" })
```

The harness supports `server.get()`, `server.post()`, ordered middleware with `next()`, and response state from `render()`, `json()`, `redirect()`, `setViewData()`, and `getViewData()`. Calls to `setStatusCode()`, `setContentType()`, and `print()` are exposed through `statusCode`, `contentType`, and the ordered `printed` array.

Redirect metadata from `setRedirectStatus()`, `setHttpHeader()`, `cacheExpiration()`, and `log()` is available through the corresponding response state. A pending redirect stops subsequent middleware when the route calls `next()`, matching the SFRA server lifecycle.

Middleware can intentionally stop the chain by omitting `next()`. Passing an `Error` to `next(error)` rejects the Promise returned by `run()`, and calling `next()` repeatedly from one middleware produces an explicit diagnostic.

Controller inheritance works through the same `module.superModule` resolution used by scripts:

```js
const server = require("server")

server.extend(module.superModule)
server.prepend("Show", authorizeCustomer)
server.append("Show", addViewData)
server.replace("Submit", submitReplacement)

module.exports = server.exports()
```

The harness clones inherited routes and preserves the resulting middleware order for assertions and execution.

`module.superModule` loads the next matching implementation in cartridge-path order. Transitive supermodule chains pass through the same CommonJS transformation.

## Job steps

CommonJS job modules use the same cartridge transformation and runtime mocks as controllers and hooks:

The built-in `dw/system/Status` and `dw/system/StatusItem` support message parameters, details, mutable items, property/getter pairs, and multi-item error aggregation.

The built-in `dw/util/ArrayList` supports common construction, mutation, sorting, cloning, and iteration patterns used by cartridge scripts.

The built-in `dw/util/HashMap` supports arbitrary key types, common map operations, bulk copying, cloning, and live collection views.

The built-in `dw/util/StringUtils` supports numbered message formatting and UTF-8 Base64 encoding and decoding. Locale-sensitive formatting remains mockable application behavior.

The built-in `dw/util/Calendar` supports deterministic UTC field operations, date arithmetic, and comparisons. Parsing, locale patterns, and time zones remain mockable application behavior.

```ts
const jobModule = await import("../cartridge/scripts/jobs/GenerateFeed.js")
const jobStep = getSfccRuntime().jobStep(jobModule, {
  context: { feedNumber: 1 },
})

const result = await jobStep.run("Run", {
  TargetFolder: "IMPEX/src/feeds",
})

expect(result).toBe("OK")
expect(jobStep.jobExecution.context.feedNumber).toBe(2)
```

This models task-oriented `script-module-step` functions with the SFCC `(parameters, stepExecution)` signature. `stepExecution.getJobExecution()` returns a stable execution object whose `context` is shared across calls.

Chunk modules are orchestrated with the function names from `steptypes.json`:

```ts
const result = await getSfccRuntime()
  .jobStep(chunkModule)
  .runChunk({
    chunkSize: 1000,
    functions: {
      afterChunk: "afterChunk",
      afterStep: "afterStep",
      beforeStep: "beforeStep",
      getTotalCount: "getTotalCount",
      process: "process",
      read: "read",
      write: "write",
    },
    parameters: { TargetFolder: "IMPEX/src/feeds" },
  })
```

The lifecycle supports asynchronous callbacks, skipped process results, persistent job context, and configurable function names. The write callback receives an iterable SFCC-like list with `size()`, `get()`, `toArray()`, and `isEmpty()`. `afterStep` receives the success state even when another lifecycle function throws.

### Load by type ID

Use `loadSfccJobStep()` to execute the effective `steptypes.json` definition without duplicating its module path, function names, or chunk size in the test:

```ts
import { loadSfccJobStep } from "@commerce-klaus/vitest-sfcc"

const jobStep = await loadSfccJobStep("custom.ExportProducts", {
  context: { exportedFiles: [] },
})

const result = await jobStep.run({
  TargetFolder: "IMPEX/src/feeds",
})

expect(jobStep.definition.kind).toBe("chunk-script-module-step")
expect(jobStep.stepExecution.getStepTypeID()).toBe("custom.ExportProducts")
expect(jobStep.jobExecution.context.exportedFiles).toHaveLength(1)
```

The plugin discovers definitions at configuration time using cartridge-path priority. Loading remains lazy, so unrelated job modules and their platform dependencies are not evaluated. Task definitions invoke their configured `function`; chunk definitions automatically apply their configured lifecycle names and `chunk-size`. Unknown IDs and registrations whose module cannot be resolved produce the same explicit missing-step diagnostic. The harness exposes the loaded type ID through `stepExecution.stepTypeID` and `getStepTypeID()`. Its shared `SfccJobContext` supports both normal property access and common `dw.util.Map` operations, including live key, value, and entry collection views with SFCC-style iterators. Iterators can consume their remaining elements into an independent `SfccList` with parameterless `asList()`. `jobStep.definition` also exposes optional description, site-context, organization-context, parallel-execution, and transactional metadata without inventing a job context or enforcing capabilities that depend on one.

Before invoking the module, `run()` applies declared defaults and `@trim`, then normalizes `boolean`, `long`, `double`, `string`, and `time-string` values. This covers SFCC metadata that stores Boolean and numeric defaults as strings. Missing required parameters, invalid booleans, non-finite numbers, and non-integer `long` values reject with a diagnostic containing the type ID and parameter name. Parameters not declared in `steptypes.json` pass through unchanged for test-specific inputs.

If the definition declares `status-codes`, a task's direct result or a chunk step's `afterStep` result is validated when it exposes a string `code` property or `getCode()` value, matching `dw.system.Status`. An undeclared code rejects with the type ID and allowed codes. Definitions without declared status codes remain permissive, as do ordinary data results and `undefined`.

Task definitions with `timeout-in-seconds` reject `run()` when their configured duration elapses. The diagnostic includes the type ID and normalized duration. The harness clears its timeout after either outcome; as with any Promise race, JavaScript already executing in the task cannot be forcibly canceled and may continue its own asynchronous work.

## Hook execution

`dw/system/HookMgr` automatically discovers `hooks.json` through each cartridge's `package.json`. If multiple cartridges register the same extension point, the first resolvable registration in cartridge-path order is used.

```js
const HookMgr = require("dw/system/HookMgr")

if (HookMgr.hasHook("app.payment.authorize")) {
  return HookMgr.callHook("app.payment.authorize", "authorize", paymentId)
}
```

Hook scripts run through the same cartridge transformer and can use `dw/*`, `*/`, `~/`, aliases, and `module.superModule`. `getSfccRuntime().hookCalls` exposes calls for test assertions.

## CommonJS scope

The transformer supports static bindings such as:

```js
const Transaction = require("dw/system/Transaction")
const provider = require("*/cartridge/scripts/provider")

module.exports = { authorizePayment: authorizePayment }
```

It also supports object destructuring and direct named exports used by hooks, job steps, and legacy controllers:

```js
const { enrichStoreOpeningHours } = require("./helpers/storeOpeningHours")

exports.modifyGETResponse = function (document) {
  enrichStoreOpeningHours(document)
}

module.exports.status = "active"
```

Static literal requires may appear anywhere in an expression, including inside functions:

```js
function getLogger() {
  return require("dw/system/Logger").getLogger("checkout")
}
```

Local `const` aliases initialized with a string literal are also resolved:

```js
const HOOK_MANAGER = "*/cartridge/scripts/hooks/libHookExtMgr"

function getHookManager() {
  return require(HOOK_MANAGER)
}
```

Mutable or computed module IDs and mutations of an existing export property fail with an explicit diagnostic. Supporting additional CommonJS patterns is planned as the transformer matures.

## Relationship to @commerce-klaus/sfcc-test-runtime

`@commerce-klaus/vitest-sfcc` owns cartridge discovery, Vite transformation, virtual modules, hook and job metadata discovery, and the active test lifecycle. [`@commerce-klaus/sfcc-test-runtime`](../sfcc-test-runtime/) is the framework-independent core that provides module mocks, globals, platform modules, and execution harnesses.

Most Vitest projects should install only `@commerce-klaus/vitest-sfcc`. Install the runtime package directly only when building another test-runner integration or using the runtime without Vite and Vitest.

## Development

This repository uses Vite+ (`vp`):

```bash
vp install
vp check
vp test
vp run build
```

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/vitest-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/vitest-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/vitest-sfcc
