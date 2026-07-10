---
"@commerce-klaus/sfcc-module-resolver": major
"@commerce-klaus/babel-plugin-sfcc-modules": patch
"@commerce-klaus/vite-plugin-sfcc-modules": patch
"@commerce-klaus/typescript-sfcc": major
"@commerce-klaus/eslint-config-sfcc": patch
---

Introduce a new shared package, `@commerce-klaus/sfcc-module-resolver`, to centralize SFCC module resolution and cartridge-order detection.

Migrate `babel-plugin-sfcc-modules`, `vite-plugin-sfcc-modules`, `typescript-sfcc`, and `eslint-config-sfcc` to use the shared resolver logic for consistent handling of SFCC patterns like `*/`, `~/`, and `module.superModule`.

Include reusable site-template cartridge-path parsing (`site.xml` `custom-cartridges`) in the shared package and expand the shared package README with usage examples and API documentation.
