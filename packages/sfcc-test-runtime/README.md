# @commerce-klaus/sfcc-test-runtime

Framework-independent SFCC runtime modules and dependency mocking for local tests.

The initial runtime provides a module registry, hook execution, and focused
implementations of `dw/system/HookMgr`, `dw/system/Status`,
`dw/system/Transaction`, `dw/system/Logger`, and `dw/system/Site`.
Use `@commerce-klaus/vitest-sfcc` to connect the runtime to cartridge modules in Vitest.

## License

MIT
