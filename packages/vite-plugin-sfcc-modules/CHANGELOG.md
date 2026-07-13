# Changelog

## 1.0.2

### Patch Changes

- 8c07a16: Introduce a new shared package, `@commerce-klaus/sfcc-module-resolver`, to centralize SFCC module resolution and cartridge-order detection.

  Migrate `babel-plugin-sfcc-modules`, `vite-plugin-sfcc-modules`, `typescript-sfcc`, and `eslint-config-sfcc` to use the shared resolver logic for consistent handling of SFCC patterns like `*/`, `~/`, and `module.superModule`.

  Include reusable site-template cartridge-path parsing (`site.xml` `custom-cartridges`) in the shared package and expand the shared package README with usage examples and API documentation.

- 18a2464: Use correct URL for badges in README.md
- Updated dependencies [8c07a16]
- Updated dependencies [856caee]
  - @commerce-klaus/sfcc-module-resolver@1.0.0

## 1.0.1

### Patch Changes

- be49474: Fix SFCC module path resolution stability across different working directories for Babel-based usage.

  Improve Vite plugin test reliability by testing plugin hooks directly, so the test suite no longer depends on root-level Vite config wiring.

## 1.0.0

### Major Changes

- f99d236: Initial Commerce-Klaus release baseline for `@commerce-klaus/vite-plugin-sfcc-modules`.

  - Prepare the first scoped release under the Commerce-Klaus organization.
  - Continues [vite-config-sfcc-modules](https://github.com/jenssimon/vite-config-sfcc-modules).

All notable changes to this package are documented in this file.

## Unreleased

- Initial release from this monorepo is not published yet.
- Package lineage: previously published as `vite-plugin-sfcc-modules`.
