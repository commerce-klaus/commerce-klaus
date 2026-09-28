---
"@commerce-klaus/sfcc-module-resolver": patch
"@commerce-klaus/typescript-sfcc": patch
---

Prefer existing TypeScript language-service resolutions so the official Salesforce B2C Commerce extension can own Script API and cartridge module resolution while Commerce Klaus supplies generated project types, `module.superModule`, and CLI typechecking. Align cartridge-order discovery with Salesforce's `SFCC_CARTRIDGES` environment variable while retaining `SFCC_CARTRIDGE_PATH` compatibility.
