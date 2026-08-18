---
"@commerce-klaus/babel-plugin-sfcc-modules": minor
---

Add optional cartridge-order inference when `cartridgePath` is not provided.

The Babel plugin can now derive cartridge order from:

- `envCartridgePath` (or `SFCC_CARTRIDGE_PATH`)
- `solutionConfigPath` references
- `siteTemplatePath` + `site` (`custom-cartridges` in `site.xml`)
- filesystem fallback

Also adds test coverage for site-template inference and expands README documentation with detailed usage and behavior sections.
