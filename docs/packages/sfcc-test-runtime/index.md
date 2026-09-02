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
runtime.reset()
```

An unknown module fails with an actionable error unless the caller supplies a real cartridge fallback. This prevents incomplete platform behavior from making tests pass accidentally.

## License

MIT
