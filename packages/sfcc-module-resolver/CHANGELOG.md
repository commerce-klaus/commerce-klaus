# @commerce-klaus/sfcc-module-resolver

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
