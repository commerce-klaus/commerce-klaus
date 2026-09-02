# @commerce-klaus/sfcc-test-runtime

Framework-independent SFCC runtime modules and dependency mocking for local tests.

The initial runtime provides a module registry, hook execution, and focused
implementations of `dw/system/HookMgr`, `dw/system/Status`,
`dw/system/Transaction`, `dw/system/Logger`, and `dw/system/Site`.
Use `@commerce-klaus/vitest-sfcc` to connect the runtime to cartridge modules in Vitest.

`runtime.mock(moduleId, implementation)` replaces a module specifier globally.
`runtime.mockResolved(absolutePath, implementation)` targets one resolved file
and takes precedence over a specifier mock.

The runtime installs the SFCC `empty()` global for nullish values, empty strings,
arrays, and SFCC collections through `isEmpty()`. `runtime.setGlobals({ request,
session, customer })` exposes additional controlled globals to cartridge code.
`runtime.reset()` removes added globals, restores previous values, and reinstalls
the default `empty()` implementation.

The built-in `server` module registers SFRA `get` and `post` routes. Execute an
exported controller with `runtime.controller(controller).run(routeName,
request)` and inspect its render, JSON, redirect, and view-data response state.
Controller inheritance supports `extend()`, `prepend()`, `append()`, and
`replace()`. Raw responses expose status code, content type, and printed output.
Redirect responses expose status, headers, cache period, and message logs, and
stop the remaining middleware chain.
Middleware can stop by omitting `next()`. Calling `next(error)` rejects the route
run, while repeated `next()` calls fail with an explicit diagnostic.

Script-module job steps can be executed with
`runtime.jobStep(jobModule).run(functionName, parameters)`. The harness supplies
SFCC-like job and step execution objects and keeps their mutable `context`
across runs. Configure job, step, and execution IDs through the harness options;
properties such as `stepTypeID` and `jobID` have matching platform getters. The
context preserves property access while also providing common `dw.util.Map`
operations such as `get()`, `put()`, `remove()`, `containsKey()`, and `size()`.
Its `keySet()`, `values()`, and `entrySet()` methods return live, iterable
SFCC-like collection views.
Chunk modules run through `runChunk({ chunkSize, functions, parameters })`,
which orchestrates step and chunk callbacks, filters null process results, and
passes an SFCC-like list to `write`.

## License

MIT
