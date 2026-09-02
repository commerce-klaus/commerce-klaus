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

Mocks can target `dw/*`, `*/`, and `~/` module identifiers. Without a cartridge mock, `*/` and `~/` load the real file selected by cartridge resolution.

## Current CommonJS scope

The initial transformer supports static top-level bindings such as:

```js
const Transaction = require("dw/system/Transaction")
const provider = require("*/cartridge/scripts/provider")

module.exports = { authorizePayment: authorizePayment }
```

Dynamic or nested `require()` calls and named `exports.foo` assignments fail with an explicit diagnostic. Supporting those patterns and `module.superModule` is planned as the transformer matures.

## License

MIT
