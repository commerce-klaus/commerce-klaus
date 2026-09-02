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
`stepExecution` exposes a persistent `getJobExecution().context` object.
`runChunk({ chunkSize, functions, parameters })` orchestrates chunk modules with
the function names declared in `steptypes.json` and supplies an SFCC-like list
to the configured write function.
The runtime's `dw/system/Status` and `dw/system/StatusItem` implementations
support property/getter pairs, message parameters, details, mutable items, and
multi-item status aggregation.

For cartridge metadata-driven tests, `loadSfccJobStep(typeId, options)` discovers
the effective `steptypes.json` entry, lazily imports its module, and selects task
or chunk execution automatically:

```ts
const jobStep = await loadSfccJobStep("custom.ExportProducts", {
  context: { exportedFiles: [] },
})

const result = await jobStep.run({ TargetFolder: "IMPEX/src/feeds" })
```

`jobStep.definition` exposes the resolved metadata, including optional site,
organization, parallel-execution, and transactional capabilities, while
`jobStep.jobExecution.context` contains shared execution state and common
`dw.util.Map` operations without losing normal property access. Live
`keySet()`, `values()`, and `entrySet()` collection views are available for
collection-oriented assertions and support `iterator().hasNext()/next()`.
The iterator's parameterless `asList()` consumes its remaining elements into
an independent `SfccList`.
Duplicate type
IDs use cartridge-path priority, and unknown or unresolvable IDs fail with an
explicit diagnostic. The loaded definition's type ID is also available through
`jobStep.stepExecution.stepTypeID` and `getStepTypeID()`.

Before each run, declared defaults are applied and strings marked with `@trim`
are trimmed. Values declared as `boolean`, `long`, or `double` are converted
from their common `steptypes.json` string forms. Missing required parameters and
invalid primitive values reject the run with the type ID and parameter name.
Undeclared test parameters remain available to the job module.

When `steptypes.json` declares status codes, Status-like task results and chunk
`afterStep` results exposing `code` or `getCode()` are checked against that
list. Undeclared codes reject with the type ID and allowed values. Steps without
a status declaration and ordinary non-Status results remain unrestricted.

Task definitions with `timeout-in-seconds` reject runs that exceed the declared
duration. The harness clears its own timer after every outcome, but JavaScript
already running inside the task cannot be forcibly canceled.

Static relative dependencies such as `require("./helper")` use the same registry.
Use `mockResolved(absolutePath, implementation)` when only one exact file should
be replaced.

The cartridge transformer supports default `module.exports`, direct named
`exports.foo` and `module.exports.foo` assignments, and destructured static
requires. Static literal requires can also be used in expressions such as
`require("./helper").foo()`. Local `const` aliases initialized with a string
literal are resolved too; mutable or computed module IDs are rejected.

The initial release resolves `dw/*`, `*/`, `~/`, cartridge aliases, and
`module.superModule`. Runtime modules include `Status`, `StatusItem`, `ArrayList`,
`HashMap`, `StringUtils`, `Transaction`, `Logger`, `Site`, and `HookMgr`. Hook
registrations are discovered automatically from each cartridge's declared
`hooks.json`, using cartridge-path priority.

## License

MIT
