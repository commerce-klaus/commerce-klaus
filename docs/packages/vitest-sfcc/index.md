# @commerce-klaus/vitest-sfcc

Cartridge-aware SFCC runtime and dependency mocking for Vitest. It provides a modern alternative to `proxyquire` for statically analyzable cartridge modules.

## Installation

```bash
pnpm add -D @commerce-klaus/vitest-sfcc vitest
```

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

The cartridge order can also be inferred from the same environment, solution config, and site-template options supported by the shared module resolver.

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

`module.superModule` loads the next matching implementation in cartridge-path order. Transitive supermodule chains pass through the same CommonJS transformation.

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

## License

MIT
