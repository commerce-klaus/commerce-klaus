# @commerce-klaus/sfcc-test-runtime

## 1.2.0

### Minor Changes

- 9e4e85a: Avoid evaluating discovered hook implementations when tests provide an explicit `dw/system/HookMgr` mock, and expose module-mock inspection through the test runtime.

## 1.1.1

### Patch Changes

- edd1a61: Match SFCC script module mocks with or without a supported file extension. Export the shared runtime extensions through a dependency-light subpath.
- Updated dependencies [edd1a61]
  - @commerce-klaus/sfcc-module-resolver@2.1.1

## 1.1.0

### Minor Changes

- 48daf21: Add a Custom API test harness with request globals, customer context, a focused `dw/system/RESTResponseMgr`, and captured success or RFC 9457 error responses.
- cf0122e: Add typed SFCC global contracts, runtime inspection and selective removal APIs, and configurable project-level default globals.

## 1.0.0

### Major Changes

- 2a25e79: Release the SFCC test runtime and cartridge-aware Vitest integration as stable
  `1.0.0` packages.

## 0.2.0

### Minor Changes

- 2f1e1f5: Add a framework-independent SFCC test runtime for dependency replacement and focused platform behavior.

  The runtime provides controlled SFCC globals, module and resolved-file mocks, hook execution, SFRA controller routing and inheritance, task and chunk job-step harnesses, and observable runtime calls. Built-in modules cover common `Status`, collection, calendar, string utility, transaction, logger, site, and hook-manager behavior without attempting to emulate the complete platform.
