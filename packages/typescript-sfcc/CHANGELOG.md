# Changelog

## 0.2.0

### Minor Changes

- a542c7c: Add `sfcc-ts-sync-types` CLI to sync vendored SFCC script types from `b2c-script-types` output.

  Switch `dw/*` path mapping to `.b2c-script-types/types/dw/*` (relative to each project config) and remove the hardcoded `sfcc-dts` assumption.

  Declare `@salesforce/b2c-cli` as a peer dependency and document recommended scripts for `prepare`, type sync, and cartridge typechecking.

## 0.1.2

### Patch Changes

- e98bbc9: Improve SFCC module resolution ergonomics by removing the need for explicit `*/` path mappings in cartridge configs.

  - Keep existing `compilerOptions.paths` entries from project config and merge in generated SFCC paths instead of overwriting them.
  - Ensure `*/...` imports continue to resolve in the shared SFCC module resolver used by both CLI typecheck and tsserver plugin.
  - Add tests for `*/...` resolution in resolver and project typecheck flows.

## 0.1.1

### Patch Changes

- c1b2b44: - fix: make sfcc-ts-typecheck resolve configs reliably

## 0.1.0

### Minor Changes

- f99d236: Initial Commerce-Klaus release baseline for `@commerce-klaus/typescript-sfcc`.

  - Prepare the first scoped release under the Commerce-Klaus organization.
  - Introduces this package as a solution to typecheck SFCC code.

All notable changes to this package are documented in this file.

## Unreleased

- Initial release from this monorepo is not published yet.
