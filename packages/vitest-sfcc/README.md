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

Static relative dependencies such as `require("./helper")` use the same registry.
Use `mockResolved(absolutePath, implementation)` when only one exact file should
be replaced.

The cartridge transformer supports default `module.exports`, direct named
`exports.foo` and `module.exports.foo` assignments, and destructured static
requires. Static literal requires can also be used in expressions such as
`require("./helper").foo()`; dynamic module IDs are rejected.

The initial release resolves `dw/*`, `*/`, `~/`, cartridge aliases, and
`module.superModule`. Runtime modules include `Status`, `Transaction`, `Logger`,
`Site`, and `HookMgr`. Hook registrations are discovered automatically from each
cartridge's declared `hooks.json`, using cartridge-path priority.

## License

MIT
