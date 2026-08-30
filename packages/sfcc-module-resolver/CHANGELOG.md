# @commerce-klaus/sfcc-module-resolver

## 1.3.0

### Minor Changes

- 2aa9712: Add shared Custom API discovery and OpenAPI (OAS 3.0) parsing helpers: `findApiJsonFiles`, `findCustomApiDefinitions`, `findOperationByOperationId`, `findSuccessOasResponse`, `getRequiredCustomApiExportsForScriptFile`, `loadOasDocument`, `resolveCustomApiScriptPath`, `resolveOasParameter`, `resolveOasRef`, `resolveOasRequestBody`, and `schemaContainsAdditionalProperties`. These back the Custom API type generation in `@commerce-klaus/typescript-sfcc` and the new `sfcc/valid-custom-api-export`, `sfcc/valid-custom-api-dir-name`, and `sfcc/no-custom-api-additional-properties` rules in `@commerce-klaus/eslint-config-sfcc`.

### Patch Changes

- 1ae5516: Point package homepage metadata to the canonical Commerce Klaus documentation pages and correct the TypeScript package repository directory.

## 1.2.0

### Minor Changes

- 720f46b: Add shared helpers for resolving cartridge hook registrations: `findCartridgeRootForFile`, `getCartridgeHooksJsonPath`, `getHookRegistrationsFromDocument`, `resolveHookScriptPath`, `getRequiredHookExportName`, and `getRequiredHookExportsForScriptFile`.

### Patch Changes

- 720f46b: Split `src/index.ts` into focused internal modules (`cartridge-order.ts`, `module-resolution.ts`, `super-module.ts`, `hooks.ts`) re-exported from `index.ts`. No public API changes.

## 1.1.0

### Minor Changes

- 2606f44: Centralize cartridge root resolution in `@commerce-klaus/sfcc-module-resolver` and reuse it in both plugin packages.

  ## What changed
  - Added shared helpers in resolver:
    - `resolveCartridgesBasePath(basePath, cwd, containingFile?)`
    - `resolveCartridgeRoots(options)`
  - Refactored `@commerce-klaus/vite-plugin-sfcc-modules` to use shared cartridge root resolution.
  - Refactored `@commerce-klaus/babel-plugin-sfcc-modules` to use shared cartridge root resolution.
  - Added resolver tests for base path fallback and shared root resolution.
  - Updated resolver documentation with the new shared APIs.

  ## Why

  Both plugins had near-identical logic for resolving base paths and cartridge roots. This removes duplication and ensures consistent behavior across Babel and Vite integrations.

## 1.0.0

### Major Changes

- 8c07a16: Introduce a new shared package, `@commerce-klaus/sfcc-module-resolver`, to centralize SFCC module resolution and cartridge-order detection.

  Migrate `babel-plugin-sfcc-modules`, `vite-plugin-sfcc-modules`, `typescript-sfcc`, and `eslint-config-sfcc` to use the shared resolver logic for consistent handling of SFCC patterns like `*/`, `~/`, and `module.superModule`.

  Include reusable site-template cartridge-path parsing (`site.xml` `custom-cartridges`) in the shared package and expand the shared package README with usage examples and API documentation.

### Patch Changes

- 856caee: Harmonize `siteTemplatePath` handling across the shared resolver and TypeScript SFCC tooling.

  `@commerce-klaus/sfcc-module-resolver` now exposes a shared `DEFAULT_SITE_TEMPLATE_PATH` constant plus a reusable `resolveSiteTemplatePath()` helper, and falls back to the default `sites/site_template` location when cartridge order is inferred from `site.xml` and only `site` is configured.

  `@commerce-klaus/typescript-sfcc` now uses the shared resolver path logic for custom attribute metadata discovery and supports configuring the site template directory consistently through `siteTemplatePath` and the `sfcc-ts-sync-types --site-template-path <path>` CLI flag.

## 0.1.0

- Initial release.
