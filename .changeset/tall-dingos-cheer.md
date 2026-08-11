---
"@commerce-klaus/eslint-config-sfcc": patch
---

Migrate from `eslint-plugin-es` to `eslint-plugin-es-x` in the SFCC recommended config.

- replace `eslint-plugin-es` + `@eslint/compat` with `eslint-plugin-es-x`
- apply `restrict-to-es2015` as the baseline and keep SFCC-specific overrides in a separate layer
- switch rule IDs from `es/*` to `es-x/*`
- update tests and documentation to match the new baseline wiring and explicitly allowed ES2015+ features
