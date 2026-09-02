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

The SFCC `empty()` global is available by default, including SFCC collections
through `isEmpty()`. Use
`getSfccRuntime().setGlobals({ request, session, customer })` for additional
globals referenced directly by cartridge code. `reset()` restores the worker's
previous global state and reinstalls `empty()`.

SFRA controllers can import the built-in `server` test module. After importing a
controller, execute a registered route with
`getSfccRuntime().controller(controller.default).run("Route", request)`.
Extended controllers can use `module.superModule` with `server.extend()`,
`prepend()`, `append()`, and `replace()`.
Raw response assertions use `response.statusCode`, `response.contentType`, and
`response.printed`.
Redirect assertions use `redirectUrl`, `redirectStatus`, `headers`,
`cachePeriod`, and `messageLog`; pending redirects stop subsequent middleware.
Middleware may stop without `next()`, and `next(error)` rejects the route run.

Imported script-module job steps run through the same cartridge transformer:
`getSfccRuntime().jobStep(jobModule).run("Run", parameters)`. The generated
`stepExecution` exposes a persistent `getJobExecution().context` object. Chunk
step lifecycle orchestration is not included yet.

Static relative dependencies such as `require("./helper")` use the same registry.
Use `mockResolved(absolutePath, implementation)` when only one exact file should
be replaced.

The cartridge transformer supports default `module.exports`, direct named
`exports.foo` and `module.exports.foo` assignments, and destructured static
requires. Static literal requires can also be used in expressions such as
`require("./helper").foo()`. Local `const` aliases initialized with a string
literal are resolved too; mutable or computed module IDs are rejected.

The initial release resolves `dw/*`, `*/`, `~/`, cartridge aliases, and
`module.superModule`. Runtime modules include `Status`, `Transaction`, `Logger`,
`Site`, and `HookMgr`. Hook registrations are discovered automatically from each
cartridge's declared `hooks.json`, using cartridge-path priority.

## License

MIT
