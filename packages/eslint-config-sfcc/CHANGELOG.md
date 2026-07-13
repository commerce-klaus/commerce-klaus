# Changelog

## 1.2.5

### Patch Changes

- 86c5515: Trigger another patch release for `@commerce-klaus/eslint-config-sfcc` to validate tag and GitHub release creation.

## 1.2.4

### Patch Changes

- f49bbad: Trigger a patch release for `@commerce-klaus/eslint-config-sfcc` to verify the final release workflow behavior.

## 1.2.3

### Patch Changes

- 7effb0a: Trigger a patch release for `@commerce-klaus/eslint-config-sfcc` to verify tag and GitHub release note generation from changelog.

## 1.2.2

### Patch Changes

- 90a6e3e: Trigger a patch release for `@commerce-klaus/eslint-config-sfcc` to validate the release workflow (publish, tagging, and GitHub release creation).

## 1.2.1

### Patch Changes

- 0b50bd3: Fix `sfcc/no-empty-global` suggestions so they replace the full `empty(...)` call and include suggestions for identifier/member-expression arguments.

## 1.2.0

### Minor Changes

- 002b818: Add an SFCC-specific lint rule that disallows the `empty()` global and document it in the package README.

### Patch Changes

- 8c07a16: Introduce a new shared package, `@commerce-klaus/sfcc-module-resolver`, to centralize SFCC module resolution and cartridge-order detection.

  Migrate `babel-plugin-sfcc-modules`, `vite-plugin-sfcc-modules`, `typescript-sfcc`, and `eslint-config-sfcc` to use the shared resolver logic for consistent handling of SFCC patterns like `*/`, `~/`, and `module.superModule`.

  Include reusable site-template cartridge-path parsing (`site.xml` `custom-cartridges`) in the shared package and expand the shared package README with usage examples and API documentation.

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

## 1.1.0

### Minor Changes

- 3fde52a: Added new rule ignores for eslint-plugin-unicorn

  - `unicorn/logical-assignment-operators`
  - `unicorn/no-computed-property-existence-check`
  - `unicorn/prefer-iterator-to-array-at-end`
  - `unicorn/prefer-logical-operator-over-ternary`
  - `unicorn/prefer-unicode-code-point-escapes`

### Patch Changes

- 78684ee: Add per-rule Markdown documentation pages and link them from the rule metadata so ESLint diagnostics point to the detailed rule docs.

## 1.0.0

### Major Changes

- f99d236: Initial Commerce-Klaus release baseline for `@commerce-klaus/eslint-config-sfcc`.

  - Prepare the first scoped release under the Commerce-Klaus organization.
  - Continues [@jenssimon/eslint-config-sfcc](https://github.com/jenssimon/eslint-config-sfcc).

All notable changes to this package are documented in this file.

## Unreleased

- Initial release from this monorepo is not published yet.
- Package lineage: previously published as `@jenssimon/eslint-config-sfcc`.
- Migration guidance from v4 remains in the README section "Migrating from v4".
