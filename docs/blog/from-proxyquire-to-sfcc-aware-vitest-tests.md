---
blogPost: true
title: From proxyquire to SFCC-aware Vitest tests
description: Why SFCC module resolution should be test infrastructure, not a mock repeated across cartridge tests.
date: 2026-09-13
author: jenssimon
tags:
  - testing
  - vitest
  - migration
---

`proxyquire` has helped many CommonJS projects test modules without changing production code. It does one focused job: load a module while replacing selected `require()` dependencies. For ordinary Node.js modules, that can be exactly the right level of control.

Salesforce Commerce Cloud cartridges add another problem, though. A dependency is not always a file that Node.js can resolve. It may be a `dw/*` platform module, the first match for a `*/` import, a module relative to the current cartridge through `~/`, an explicit cartridge alias, or the next implementation in a `module.superModule` chain. The [SFCC module resolution guide](/guide/sfcc-module-resolution) explains these forms and their precedence in detail.

Tests should not have to recreate those rules one dependency map at a time.

That is the reason for [`@commerce-klaus/vitest-sfcc`](/packages/vitest-sfcc/). It does not try to make dependency mocking disappear. It makes SFCC module loading part of the test environment, so a test only mocks behavior that matters to the scenario.

## TL;DR

- `proxyquire` is a capable, established choice for replacing CommonJS dependencies.
- SFCC adds module identifiers and runtime behavior that a general-purpose CommonJS loader does not know about.
- `vitest-sfcc` configures cartridge resolution once and lets real cartridge modules load through Vitest.
- Tests still mock external behavior, but they no longer need to mock a dependency merely because Node.js cannot resolve its SFCC `require()` call.
- The integration also provides controlled globals, focused `dw/*` implementations, and harnesses for controllers, hooks, and job steps.
- Migration can be incremental. Existing tests do not need to move in one large rewrite.

## Two different responsibilities

It is tempting to compare the two packages only by their mocking syntax:

```ts
const subject = proxyquire("../cartridge/scripts/example", {
  "dw/system/Site": siteMock,
  "*/cartridge/scripts/helpers/format": formatMock,
})
```

and:

```ts
const runtime = resetSfccRuntime()
runtime.mock("dw/system/Site", siteMock)
runtime.mock("*/cartridge/scripts/helpers/format", formatMock)

const subject = await import("../cartridge/scripts/example.js")
```

Both examples replace dependencies. The important difference is what happens when a dependency is _not_ replaced.

With `proxyquire`, Node.js remains responsible for loading it. Node.js does not understand the SFCC cartridge path, so unresolved platform and cartridge imports usually need another stub, alias, or loader workaround. Calling `.noCallThru()` makes that boundary explicit and predictable, but it also means the test must provide every dependency that cannot be loaded normally.

With `vitest-sfcc`, the Vite module graph uses the configured cartridge path. An unmocked `*/cartridge/scripts/helpers/format` can resolve to the real highest-precedence cartridge module. A `~/` import stays within the importing cartridge. An explicit cartridge alias selects that cartridge, and `module.superModule` can continue with the next matching implementation.

The test chooses between real and mocked behavior. It does not first need to teach the test runner what an SFCC module identifier means.

## Configure the project once

The cartridge path belongs to the project configuration because all tests should agree about its precedence:

```ts [vitest.config.ts]
import sfccVitest from "@commerce-klaus/vitest-sfcc"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: "./cartridges",
      cartridgePath: ["app_custom", "app_storefront_base"],
    }),
  ],
})
```

The explicit array is optional. The same order can be inferred from the environment, `jsconfig.json`, or site metadata. Whichever source a project uses, resolution remains centralized rather than being approximated independently in each test.

This matters because cartridge order is behavior. If `app_custom` and `app_storefront_base` both contain a module, selecting the first one is not a test convenience; it is part of how the storefront runs.

## Mock behavior, not resolvability

Consider a small cartridge module:

```js [cartridge/scripts/order/summary.js]
const Logger = require("dw/system/Logger")
const format = require("*/cartridge/scripts/order/format")
const totals = require("./totals")

exports.create = function (basket) {
  Logger.debug("Creating order summary")
  return format.summary(totals.calculate(basket))
}
```

A test can load the real cartridge dependencies according to the project configuration while the platform boundary remains controlled. The runtime already provides `dw/system/Logger` and records its output, so the test does not need a logger mock:

```ts [summary.test.ts]
import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"
import { expect, it, vi } from "vitest"

it("creates a summary from the calculated totals", async () => {
  vi.resetModules()
  const runtime = resetSfccRuntime()

  const summary = await import("../cartridge/scripts/order/summary.js")

  expect(summary.default.create(sampleBasket)).toEqual(expectedSummary)
  expect(runtime.loggerEntries).toContainEqual({
    level: "debug",
    message: "Creating order summary",
    parameters: [],
  })
})
```

There is no mock for `dw/system/Logger`, `*/cartridge/scripts/order/format`, or `./totals` merely to get the module loaded. The logger is a controlled platform implementation, while the cartridge modules remain real collaborators unless the scenario needs to isolate one of them.

When isolation is useful, it stays explicit:

```ts
runtime.mock("./totals", {
  calculate: () => ({ merchandise: 100, shipping: 5 }),
})
```

Specifier mocks cover `dw/*`, `*/`, `~/`, cartridge aliases, and relative imports. When the same relative identifier appears in several directories, `mockResolved()` can target one absolute resolved file without changing all matching imports.

## More than dependency replacement

The comparison with `proxyquire` is useful because dependency replacement is often where an SFCC test suite starts. It is not where `vitest-sfcc` stops.

SFCC code also depends on execution context. A test may need `request`, `session`, or `customer`; a controller expects the SFRA `server` lifecycle; a job step receives parameters and execution context; a hook is selected through cartridge metadata. Those concerns tend to produce project-specific helpers around a general module-mocking library. Each helper can be reasonable on its own, but over time the test suite starts maintaining a small, incomplete SFCC runtime.

`vitest-sfcc` brings these concerns into one integration:

| Test concern        | What the integration provides                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Cartridge modules   | Resolution for `*/`, `~/`, named cartridges, relative modules, and `module.superModule`         |
| Platform boundaries | Focused `dw/*` implementations plus explicit mocks for project-specific behavior                |
| Global context      | Controlled `request`, `session`, `customer`, and the SFCC `empty()` global                      |
| SFRA controllers    | Route execution with ordered middleware and observable response state                           |
| Hooks               | `hooks.json` discovery, cartridge precedence, `HookMgr`, and recorded calls                     |
| Job steps           | Task and chunk lifecycles, execution context, and metadata-driven loading from `steptypes.json` |
| Test isolation      | One resettable runtime for mocks, globals, hook registrations, and recorded calls               |

### Control platform context without global setup files

Tests can provide only the context required by a scenario:

```ts
import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"

const runtime = resetSfccRuntime({
  site: {
    id: "RefArch",
    preferences: { enableStorePickup: true },
  },
})

runtime.setGlobals({
  customer: { authenticated: true },
  request: { locale: "en_US", querystring: {} },
  session: { custom: {} },
})
```

The standard `empty()` global is installed automatically. Focused implementations are available for common modules such as `dw/system/Status`, `dw/system/Site`, `dw/system/Transaction`, `dw/util/ArrayList`, `dw/util/HashMap`, `dw/util/StringUtils`, and `dw/util/Calendar`.

The goal is not to emulate every platform API. Unknown `dw/*` modules fail unless the test supplies a mock, keeping unsupported behavior visible instead of silently approximating it.

### Execute an SFRA route, not just a controller function

The runtime resolves `require("server")` and models the route lifecycle. A test can execute the registered middleware chain and inspect the resulting response:

```ts
const controller = await import("../cartridge/controllers/Checkout.js")

const response = await runtime.controller(controller.default).run("Begin", {
  querystring: { stage: "shipping" },
})

expect(response.view).toBe("checkout/checkout")
expect(response.viewData).toMatchObject({ currentStage: "shipping" })
```

The harness supports `get`, `post`, `prepend`, `append`, and `replace`, including inherited routes through `module.superModule`. It records rendering, JSON output, redirects, headers, status codes, printed output, cache settings, and route log messages. Middleware can continue with `next()`, stop intentionally, or reject the route with `next(error)`.

This tests the controller contract while leaving HTTP transport and the full sandbox outside the unit-test boundary.

### Discover hooks through project metadata

Hook behavior is not defined by a JavaScript import alone. The effective implementation comes from `package.json`, `hooks.json`, and cartridge precedence.

The plugin discovers those registrations when Vitest starts. Cartridge code can use `dw/system/HookMgr` normally:

```js [cartridge/scripts/payment.js]
const HookMgr = require("dw/system/HookMgr")

exports.authorize = function (paymentId) {
  if (!HookMgr.hasHook("app.payment.authorize")) return null
  return HookMgr.callHook("app.payment.authorize", "authorize", paymentId)
}
```

The test loads the caller without recreating the hook registry:

```ts
const payment = await import("../cartridge/scripts/payment.js")

expect(payment.default.authorize("payment-1")).toEqual({ authorized: true })
expect(runtime.hookCalls).toContainEqual({
  extensionPoint: "app.payment.authorize",
  functionName: "authorize",
  args: ["payment-1"],
})
```

When multiple cartridges register the same extension point, the first resolvable registration wins according to the configured cartridge path. Focused tests can disable discovery, restrict it to selected cartridges, or register a hook directly with `runtime.registerHook()`.

### Execute a job from its `steptypes.json` contract

Job tests often duplicate the module path, function name, chunk size, defaults, and parameter assumptions already declared in `steptypes.json`. `loadSfccJobStep()` uses the effective metadata definition instead:

```ts
import { loadSfccJobStep } from "@commerce-klaus/vitest-sfcc"

const jobStep = await loadSfccJobStep("custom.ExportProducts", {
  context: { exportedFiles: [] },
})

const result = await jobStep.run({
  TargetFolder: "IMPEX/src/feeds",
})

expect(result).toBe("OK")
expect(jobStep.stepExecution.getStepTypeID()).toBe("custom.ExportProducts")
expect(jobStep.jobExecution.context.exportedFiles).toHaveLength(1)
```

Task definitions call their configured function. Chunk definitions use their declared lifecycle names and chunk size. The harness applies defaults and trimming, converts supported parameter types, validates required and enum values, checks declared status codes, enforces configured timeouts, and keeps job context stable across lifecycle calls.

When declarations generated by `@commerce-klaus/typescript-sfcc` are present, the type ID and parameter object are checked against the project's own `steptypes.json` registry. Configuration, editor feedback, and runtime execution then describe the same job contract.

### Reset the complete boundary between tests

Vitest caches imported modules, while the SFCC runtime owns mocks, globals, hooks, and recorded calls. Isolated tests reset both layers before importing their subject:

```ts
beforeEach(() => {
  vi.resetModules()
  resetSfccRuntime()
})

afterEach(() => {
  getSfccRuntime().reset()
})
```

This distinction matters in reused Vitest workers. `vi.resetModules()` clears evaluated modules; the runtime reset clears specifier and resolved-file mocks, restores globals and `empty()`, removes direct hook registrations, and clears logger, transaction, and hook-call records.

The runtime remains intentionally focused. It should make observable SFCC behavior deterministic where that behavior can be represented faithfully, not pretend to be a complete local Commerce Cloud instance. The full API and its boundaries are documented in the [`vitest-sfcc` package guide](/packages/vitest-sfcc/).

## What changed in a real migration

We recently applied this approach to an active storefront repository with an established Vitest suite. The migration was not a clean-room example: tests already used `proxyquire`, custom SFCC mocks, relative dependencies, `dw/*` modules, and cartridge-path imports across multiple cartridges.

The work happened in stages:

1. Add the SFCC Vitest plugin and define the real cartridge order centrally.
2. Convert test loaders from synchronous `proxyquire()` calls to runtime mocks followed by dynamic imports.
3. Reset Vitest's module cache and the SFCC runtime before loading each isolated subject.
4. Keep `proxyquire` temporarily for tests that had not moved yet.
5. Remove the remaining uses after the runtime covered their loading patterns.

That temporary coexistence was useful. A migration should not require every test to change before the first converted test can run.

The resulting tests did not stop using mocks. They became more selective. Platform calls and scenario-specific collaborators remained controlled, while resolvable cartridge modules could execute as real code. The central Vitest configuration became the source of truth for precedence instead of each test encoding enough stubs to make its subject load.

The migration also exposed assumptions that the previous loader setup had hidden. That is expected when more of the real module graph runs: tests may discover an undeclared dependency, a meaningful side effect at module evaluation time, or a mismatch between the configured cartridge path and the path developers assumed. Those findings are useful feedback, but they are also a reason to migrate in reviewable steps.

## A fair choice

`proxyquire` remains a sensible choice when:

- the code under test is ordinary CommonJS that Node.js can otherwise resolve
- replacing direct dependencies is the complete testing requirement
- an existing suite is stable and SFCC-specific helpers are not causing maintenance work
- synchronous module loading is important to the test design

`vitest-sfcc` is the stronger fit when:

- tests load real cartridge code with `dw/*`, `*/`, `~/`, or cartridge aliases
- cartridge precedence or `module.superModule` should match the project
- controller, hook, job-step, global, and module behavior should share one resettable runtime
- the project wants modern Vitest tooling without recreating SFCC semantics around it

This is not a claim that a specialized tool is universally better than a general one. It is a narrower claim: for SFCC cartridge tests, understanding SFCC is part of the job.

## Less test infrastructure per project

Our goal with Commerce Klaus is to make the platform easier to work with in a modern toolset while preserving the behavior that makes SFCC distinct.

Developers should spend their test effort describing business scenarios and intentional boundaries. They should not need to mock `require()` resolution simply because the local JavaScript runtime has never heard of a cartridge path.

`vitest-sfcc` is still pre-1.0, and real storefronts will continue to reveal cases that a focused test runtime should support more clearly. Ideas, bug reports, and pull requests are welcome. The best next improvements will come from the places where SFCC projects still have to maintain repetitive test infrastructure of their own.
