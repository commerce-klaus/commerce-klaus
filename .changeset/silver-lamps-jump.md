---
"@commerce-klaus/sfcc-module-resolver": patch
"@commerce-klaus/typescript-sfcc": patch
---

Harmonize `siteTemplatePath` handling across the shared resolver and TypeScript SFCC tooling.

`@commerce-klaus/sfcc-module-resolver` now exposes a shared `DEFAULT_SITE_TEMPLATE_PATH` constant plus a reusable `resolveSiteTemplatePath()` helper, and falls back to the default `sites/site_template` location when cartridge order is inferred from `site.xml` and only `site` is configured.

`@commerce-klaus/typescript-sfcc` now uses the shared resolver path logic for custom attribute metadata discovery and supports configuring the site template directory consistently through `siteTemplatePath` and the `sfcc-ts-sync-types --site-template-path <path>` CLI flag.
