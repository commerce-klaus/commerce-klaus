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

The initial release resolves `dw/*`, `*/`, `~/`, cartridge aliases, and
`module.superModule`. Runtime modules include `Status`, `Transaction`, `Logger`,
`Site`, and `HookMgr`. Hook registrations are discovered automatically from each
cartridge's declared `hooks.json`, using cartridge-path priority.

## License

MIT
