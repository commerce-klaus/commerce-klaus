# @commerce-klaus/vitest-sfcc

## 0.2.0

### Minor Changes

- 2f1e1f5: Add cartridge-aware SFCC module execution and dependency mocking for Vitest.

  The plugin transforms supported cartridge CommonJS patterns, resolves cartridge aliases and super modules, discovers hooks and job steps, and connects cartridge modules to the SFCC test runtime. It includes controller and job-step helpers, lazy cartridge fallbacks, relative and resolved-file mocks, and a public `@commerce-klaus/vitest-sfcc/runtime` entry point. The package is pre-1.0 and provides a migration path from proxyquire-based tests.

### Patch Changes

- 8dce661: Add a shared `SfccModuleResolutionOptions` type for SFCC-aware tooling integrations.

  The Vite and Vitest adapters now derive their cartridge-resolution configuration from the shared resolver type. Their documentation also clarifies when to use module-graph resolution alone and when to use the complete Vitest runtime, transformation, and mocking integration.

- Updated dependencies [2f1e1f5]
- Updated dependencies [2f1e1f5]
- Updated dependencies [8dce661]
  - @commerce-klaus/sfcc-module-resolver@1.5.0
  - @commerce-klaus/sfcc-test-runtime@0.2.0
