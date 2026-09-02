# @commerce-klaus/sfcc-test-runtime

Framework-independent SFCC runtime modules and dependency mocking for local tests.

## Installation

```bash
pnpm add -D @commerce-klaus/sfcc-test-runtime
```

Most projects install [`@commerce-klaus/vitest-sfcc`](../vitest-sfcc/) instead, which includes this runtime and connects it to the Vite module graph.

## Runtime modules

The initial runtime provides focused implementations of:

- `dw/system/Status`
- `dw/system/Transaction`
- `dw/system/Logger`
- `dw/system/Site`
- `dw/system/HookMgr`

These implementations model behavior needed by tests and expose call history where useful. They do not attempt to emulate the complete SFCC platform.

```ts
import { createSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"

const runtime = createSfccTestRuntime({
  site: {
    id: "RefArch",
    preferences: { reviewsEnabled: true },
  },
})

runtime.mock("dw/system/Logger", loggerMock)
runtime.mockResolved("/workspace/cartridges/app_custom/cartridge/scripts/provider.js", providerMock)
runtime.reset()
```

`mock()` targets the original module identifier. This is useful for platform modules and shared identifiers such as `*/cartridge/scripts/provider` or `./helper`. `mockResolved()` targets exactly one absolute cartridge file and takes precedence when identical relative identifiers occur in different directories.

## SFCC globals

Use `setGlobals()` for process globals referenced directly by cartridge code:

```ts
runtime.setGlobals({
  customer: { authenticated: true },
  request: { locale: "de_DE", querystring: {} },
  session: { custom: {} },
})
```

The runtime provides `empty()` by default. Matching the Script API, it returns `true` for `null`, `undefined`, empty strings and arrays, and SFCC collections whose `isEmpty()` method returns `true`. Values such as `false`, `0`, whitespace, and plain objects are not empty. Tests can override it through `setGlobals()` when application-specific behavior is required.

`reset()` removes globals added by the runtime, restores the complete property descriptor of values that existed before the test, and reinstalls the default `empty()`. Call it after each test so the worker does not retain request state. Because globals are process-wide within a worker, do not run tests that install different global contexts concurrently in the same worker.

## SFRA controllers

The built-in `server` module captures `server.get()` and `server.post()` registrations from SFRA controllers. Pass the exported controller to the harness and run a route with a request object:

```ts
const controller = await import("../cartridge/controllers/Checkout.js")
const response = await runtime.controller(controller.default).run("Begin", {
  querystring: { stage: "shipping" },
})

expect(response.view).toBe("checkout/checkout")
expect(response.viewData).toMatchObject({ currentStage: "shipping" })
```

Middleware runs in registration order when it calls `next()`. The response implementation supports `render()`, `json()`, `redirect()`, `setViewData()`, and `getViewData()`.

Raw response methods are observable without a separate base-response mock:

```js
res.setContentType("text/xml")
res.setStatusCode(202)
res.print("<sitemap />")
```

The returned harness response exposes these calls through `contentType`, `statusCode`, and the ordered `printed` array.

Redirect and response metadata are captured as well:

```js
res.cacheExpiration(2)
res.log("redirect", { permanent: true })
res.setHttpHeader("X-Redirect-Source", "controller")
res.setRedirectStatus(301)
res.redirect("/target")
next()
```

The result exposes `redirectUrl`, `redirectStatus`, `headers`, `cachePeriod`, and `messageLog`. Matching SFRA routing behavior, a pending redirect stops the remaining middleware when `next()` is called.

## Middleware control

A middleware function controls the route chain through `next()`:

- Calling `next()` executes the next registered middleware.
- Returning without `next()` stops the chain normally.
- Calling `next(error)` logs the error and rejects the Promise returned by `run()`.
- Calling `next()` more than once from the same middleware rejects with an explicit diagnostic.

Both synchronous SFRA-style `next()` calls and awaited calls are supported.

Extended cartridges can inherit and modify routes using the standard SFRA pattern:

```js
const server = require("server")

server.extend(module.superModule)
server.prepend("Show", authorizeCustomer)
server.append("Show", addViewData)
server.replace("Submit", submitReplacement)

module.exports = server.exports()
```

`extend()` clones the inherited route registry. `prepend()` and `append()` preserve middleware order, while `replace()` removes the previous chain for that route. Modifying a missing route fails with an explicit error.

Hook implementations can also be registered directly. The first registration for an extension point wins, matching cartridge-path priority:

```ts
runtime.registerHook("app.payment.authorize", {
  authorize: (paymentId) => ({ paymentId, authorized: true }),
})

runtime.callHook("app.payment.authorize", "authorize", "payment-1")
```

`runtime.hookCalls` records extension point, function name, and arguments for assertions. A missing extension point or function returns `undefined`; hook exceptions propagate to the caller.

## Job steps

Task-oriented `script-module-step` modules can be executed by their configured function name:

```ts
const jobModule = await import("../cartridge/scripts/jobs/GenerateFeed.js")
const jobStep = runtime.jobStep(jobModule, {
  context: { previousFile: "feed-1.csv" },
  jobExecutionId: "execution-1",
  jobId: "NightlyFeed",
  stepExecutionId: "step-execution-1",
  stepId: "GenerateFeed",
  stepTypeId: "custom.GenerateFeed",
})

const status = await jobStep.run("Run", {
  TargetFolder: "IMPEX/src/feeds",
})

expect(jobStep.jobExecution.context).toMatchObject({
  previousFile: "feed-2.csv",
})
```

The configured function receives `(parameters, stepExecution)`. `stepExecution.getJobExecution()` returns the same job execution for every call, so scripts can share mutable `context` state across steps or repeated runs. The execution objects expose the platform properties and equivalent getters: `ID`/`getID()`, `jobID`/`getJobID()`, `stepID`/`getStepID()`, `stepTypeID`/`getStepTypeID()`, and `context`/`getContext()`. Their IDs can be set through `SfccJobStepHarnessOptions`; omitted IDs receive stable test defaults. Missing and non-function exports fail with an explicit diagnostic.

`SfccJobContext` preserves the supplied object's identity and normal property access while adding a non-enumerable `dw.util.Map`-like core: `get()`, `put()`, `remove()`, `clear()`, `containsKey()`, `containsValue()`, `size()`, `getLength()`, `isEmpty()`, `length`, and `empty`. Missing keys return `null`, matching the platform API. This keeps existing object assertions and production-style `context[key]` code working together.

`keySet()`, `values()`, and `entrySet()` return live `SfccCollection` views. They expose `length`, `empty`, `size()`, `getLength()`, `isEmpty()`, `contains()`, JavaScript iteration, `iterator()`, and both `toArray()` forms. `SfccIterator` implements the production-style `hasNext()`/`next()` loop over the elements present when the iterator is created. `SfccMapEntry` exposes `key`/`getKey()` and `value`/`getValue()`. The harness intentionally leaves mutating collection-view operations and `Iterator.asList()` out until their platform semantics can be represented faithfully; mutate the context itself with `put()`, `remove()`, or `clear()`.

Chunk-oriented modules use `runChunk()` with the function names declared in `steptypes.json`:

```ts
const result = await runtime.jobStep(chunkModule).runChunk({
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

expect(result.writtenCount).toBeGreaterThan(0)
```

The harness calls `beforeStep`, obtains the optional total count, and runs `read` and optional `process` functions in chunks. Nullish process results are skipped. `write` receives an iterable SFCC-like list with `size()`, `get()`, `toArray()`, and `isEmpty()`. `afterChunk` runs after each non-empty input chunk, while `afterStep(success, parameters, stepExecution)` runs after success or failure. The result exposes read, processed, written, and chunk counts plus the total and `afterStep` result.

An unknown module fails with an actionable error unless the caller supplies a real cartridge fallback. This prevents incomplete platform behavior from making tests pass accidentally.

## License

MIT
