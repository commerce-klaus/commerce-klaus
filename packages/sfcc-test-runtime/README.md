# @commerce-klaus/sfcc-test-runtime

[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

Framework-independent SFCC runtime modules and dependency mocking for local tests.

> [!IMPORTANT]
> This package is currently a pre-1.0 (`0.x`) release. Its API is usable but not yet considered stable, and minor releases may contain breaking changes until `1.0.0`.

## Highlights

- Replaces module identifiers globally or one exact resolved file
- Installs and restores controlled SFCC globals
- Provides focused `dw/system` and `dw/util` test implementations
- Executes SFRA controllers, hooks, script-module job steps, and chunk jobs
- Remains independent of Vite, Vitest, cartridge paths, and site-template files

## Install

```bash
pnpm add -D @commerce-klaus/sfcc-test-runtime
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

The initial runtime provides a module registry, hook execution, and focused
implementations of `dw/system/HookMgr`, `dw/system/Status`,
`dw/system/Transaction`, `dw/system/Logger`, and `dw/system/Site`.
Use `@commerce-klaus/vitest-sfcc` to connect the runtime to cartridge modules in Vitest.

`runtime.mock(moduleId, implementation)` replaces a module specifier globally.
`runtime.mockResolved(absolutePath, implementation)` targets one resolved file
and takes precedence over a specifier mock.

The runtime installs the SFCC `empty()` global for nullish values, empty strings,
arrays, and SFCC collections through `isEmpty()`. `runtime.setGlobals({ request,
session, customer })` exposes additional controlled globals to cartridge code.
`runtime.reset()` removes added globals, restores previous values, and reinstalls
the default `empty()` implementation.

The built-in `server` module registers SFRA `get` and `post` routes. Execute an
exported controller with `runtime.controller(controller).run(routeName,
request)` and inspect its render, JSON, redirect, and view-data response state.
Controller inheritance supports `extend()`, `prepend()`, `append()`, and
`replace()`. Raw responses expose status code, content type, and printed output.
Redirect responses expose status, headers, cache period, and message logs, and
stop the remaining middleware chain.
Middleware can stop by omitting `next()`. Calling `next(error)` rejects the route
run, while repeated `next()` calls fail with an explicit diagnostic.

The built-in `dw/system/Status` supports empty, single-item, and aggregated
statuses. `addItem()` selects the first error for property/getter access and
computes the overall error state across all items. The built-in
`dw/system/StatusItem` supports the SFCC setters, message parameters, and
details using the same list and map APIs as job contexts.

The built-in `dw/util/ArrayList` accepts arrays, SFCC collections, iterators,
and variadic values. It provides `add()`, `addAll()`, `push()`, `sort()`,
`reverse()`, `clone()`, indexed access, iteration, and collection inspection.

The built-in `dw/util/HashMap` supports arbitrary key types, `put()`, `putAll()`,
lookup, removal, clearing, independent clones, and live key, value, and entry
views.

The built-in `dw/util/StringUtils` supports numbered `format()` placeholders and
UTF-8 `encodeBase64()`/`decodeBase64()` helpers. Locale, date, number, money, and
resource formatting remain application-provided mocks.

The built-in `dw/util/Calendar` provides deterministic UTC construction, date
copies, common field reads and writes, date arithmetic, comparisons, leap-year
checks, and same-day checks. Parsing, rolling, clearing, and time zones remain
application-provided mocks.

Script-module job steps can be executed with
`runtime.jobStep(jobModule).run(functionName, parameters)`. The harness supplies
SFCC-like job and step execution objects and keeps their mutable `context`
across runs. Configure job, step, and execution IDs through the harness options;
properties such as `stepTypeID` and `jobID` have matching platform getters. The
context preserves property access while also providing common `dw.util.Map`
operations such as `get()`, `put()`, `remove()`, `containsKey()`, and `size()`.
Its `keySet()`, `values()`, and `entrySet()` methods return live, iterable
SFCC-like collection views. They support both JavaScript iteration and SFCC's
`iterator().hasNext()/next()` pattern. `iterator.asList()` consumes the
remaining elements into an independent SFCC-like list.
Chunk modules run through `runChunk({ chunkSize, functions, parameters })`,
which orchestrates step and chunk callbacks, filters null process results, and
passes an SFCC-like list to `write`.

## Documentation

See the [complete runtime and harness reference](https://commerce-klaus.github.io/commerce-klaus/packages/sfcc-test-runtime/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-test-runtime
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-test-runtime
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-test-runtime
