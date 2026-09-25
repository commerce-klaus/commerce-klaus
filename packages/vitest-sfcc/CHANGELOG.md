# @commerce-klaus/vitest-sfcc

## 1.0.1

### Patch Changes

- 6ffcd68: Accept job step definitions with an empty `description` value.
- Updated dependencies [6ffcd68]
  - @commerce-klaus/sfcc-module-resolver@1.8.1

## 1.0.0

### Major Changes

- 2a25e79: Release the SFCC test runtime and cartridge-aware Vitest integration as stable
  `1.0.0` packages.

### Minor Changes

- d4595b9: Add `@commerce-klaus/config` with shared `commerce-klaus.config.ts` or `.js`
  project configuration and package-level or B2C CLI overrides for cartridge and
  site resolution.

### Patch Changes

- Updated dependencies [4c7c232]
- Updated dependencies [3f2e99a]
- Updated dependencies [2e8bc10]
- Updated dependencies [3c7ce68]
- Updated dependencies [bca10ca]
- Updated dependencies [d4595b9]
- Updated dependencies [2a25e79]
- Updated dependencies [cc29c66]
  - @commerce-klaus/sfcc-module-resolver@1.8.0
  - @commerce-klaus/sfcc-test-runtime@1.0.0

## 0.4.0

### Minor Changes

- 2ae2708: Allow automatic `hooks.json` discovery to be disabled or limited to selected cartridges with the new `hookDiscovery` plugin option. This keeps focused test projects from loading unrelated hook scripts and their platform dependencies while preserving direct runtime hook registration.

### Patch Changes

- Updated dependencies [0260f66]
  - @commerce-klaus/sfcc-module-resolver@1.7.0

## 0.3.0

### Minor Changes

- e8c5d29: Generate project-specific custom job step declarations from effective `steptypes.json` metadata, including parameter, status code, and lifecycle function types, and apply them to metadata-driven Vitest job step loading.

### Patch Changes

- Updated dependencies [e8c5d29]
  - @commerce-klaus/sfcc-module-resolver@1.6.0

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
