# @commerce-klaus/vitest-sfcc

Cartridge-aware SFCC runtime and dependency mocking for Vitest.

```ts
import { defineConfig } from "vite-plus"
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

Register a dependency replacement before dynamically importing the subject:

```ts
import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc"

getSfccRuntime().mock("*/cartridge/scripts/provider", providerMock)
const subject = await import("../cartridge/scripts/subject.js")
```

The initial release resolves `dw/*`, `*/`, and `~/` dependencies. Runtime modules
include `Status`, `Transaction`, `Logger`, and `Site`.

## License

MIT
