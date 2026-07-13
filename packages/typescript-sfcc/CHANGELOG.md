# Changelog

## 1.0.0

### Major Changes

- 8c07a16: Introduce a new shared package, `@commerce-klaus/sfcc-module-resolver`, to centralize SFCC module resolution and cartridge-order detection.

  Migrate `babel-plugin-sfcc-modules`, `vite-plugin-sfcc-modules`, `typescript-sfcc`, and `eslint-config-sfcc` to use the shared resolver logic for consistent handling of SFCC patterns like `*/`, `~/`, and `module.superModule`.

  Include reusable site-template cartridge-path parsing (`site.xml` `custom-cartridges`) in the shared package and expand the shared package README with usage examples and API documentation.

### Minor Changes

- d486a49: Generate custom attribute typings for SFCC extensible objects from local metadata XML files under `sites/site_template/meta/*.xml`.

  Extend the existing `b2c-script-types` sync flow with generated declarations for `ExtensibleObject.custom`, including schema-driven handling of enum values, enum multi-select via `select-multiple-flag`, and set-based attribute types.

  Load the generated declarations consistently in both `sfcc-ts-typecheck` and the tsserver plugin so editor diagnostics and CLI diagnostics use the same custom attribute typing.

- d486a49: Extend generated SFCC custom attribute typings to cover `dw.object.SystemObjectMgr` and `dw.object.CustomObjectMgr`, as well as per-object attribute interfaces derived from local metadata XML.

  This adds typed overloads for system object and custom object creation, lookup, and query methods so both managers return the matching object shape for known metadata-backed types.

### Patch Changes

- 856caee: Harmonize `siteTemplatePath` handling across the shared resolver and TypeScript SFCC tooling.

  `@commerce-klaus/sfcc-module-resolver` now exposes a shared `DEFAULT_SITE_TEMPLATE_PATH` constant plus a reusable `resolveSiteTemplatePath()` helper, and falls back to the default `sites/site_template` location when cartridge order is inferred from `site.xml` and only `site` is configured.

  `@commerce-klaus/typescript-sfcc` now uses the shared resolver path logic for custom attribute metadata discovery and supports configuring the site template directory consistently through `siteTemplatePath` and the `sfcc-ts-sync-types --site-template-path <path>` CLI flag.

- 8ac5337: Migrate to TypeScript 7

  TypeScript 7 ships without a programmatic API (coming in 7.1). All packages that
  depend on the TypeScript compiler API now use `@typescript/typescript6` as their
  `typescript` devDependency while keeping the native TS7 binary available via
  `@typescript/native-preview` for faster builds. The peer dependency
  `typescript: ">=5.5.0"` remains unchanged.

  A patch for `eslint-plugin-sonarjs@4.1.0` is included to guard the top-level
  `ts.SyntaxKind.FunctionType` access with optional chaining so the plugin loads
  without crashing when the TypeScript API is unavailable.

- Updated dependencies [8c07a16]
- Updated dependencies [856caee]
  - @commerce-klaus/sfcc-module-resolver@1.0.0

## 0.2.1

### Patch Changes

- 0ba78c6: Fix `sfcc-ts-sync-types` so it reliably executes when invoked via package-manager shims (for example `pnpm`/`.bin` entrypoints).

  Previously, some shim invocation paths could fail the direct-execution guard and cause a silent no-op. The CLI now uses more robust entrypoint detection and path matching so sync runs consistently.

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
