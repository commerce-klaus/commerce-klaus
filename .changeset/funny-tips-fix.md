---
"@commerce-klaus/vite-plugin-sfcc-modules": minor
---

Add optional cartridge-order inference to the Vite plugin when cartridgePath is not provided.

The plugin can now derive cartridge order from:

- envCartridgePath (or SFCC_CARTRIDGE_PATH)
- solutionConfigPath references
- siteTemplatePath + site (custom-cartridges in site.xml)
- filesystem fallback

Also adds test coverage for site-template inference and documents new usage examples in README.
