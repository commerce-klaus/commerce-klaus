# @commerce-klaus/sfcc-test-runtime

Framework-independent SFCC runtime modules and dependency mocking for local tests.

The initial runtime provides a module registry, hook execution, and focused
implementations of `dw/system/HookMgr`, `dw/system/Status`,
`dw/system/Transaction`, `dw/system/Logger`, and `dw/system/Site`.
Use `@commerce-klaus/vitest-sfcc` to connect the runtime to cartridge modules in Vitest.

`runtime.mock(moduleId, implementation)` replaces a module specifier globally.
`runtime.mockResolved(absolutePath, implementation)` targets one resolved file
and takes precedence over a specifier mock.

`runtime.setGlobals({ request, session, customer, empty })` exposes controlled
SFCC globals to cartridge code. `runtime.reset()` removes added globals and
restores values that existed before the test.

## License

MIT
