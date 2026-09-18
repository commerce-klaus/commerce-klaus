---
"@commerce-klaus/typescript-sfcc": patch
"@commerce-klaus/b2c-plugin": patch
---

Load the project's TypeScript compiler for cartridge typechecks, including checks invoked through the B2C CLI plugin. TypeScript 7 is excluded until compatibility is verified. The B2C plugin now requires a TypeScript SFCC version that exposes its plugin command API.
