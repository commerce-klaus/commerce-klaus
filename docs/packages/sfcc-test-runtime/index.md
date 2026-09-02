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
