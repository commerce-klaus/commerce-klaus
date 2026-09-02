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

An unknown module fails with an actionable error unless the caller supplies a real cartridge fallback. This prevents incomplete platform behavior from making tests pass accidentally.

## License

MIT
