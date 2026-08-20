---
"@commerce-klaus/eslint-config-sfcc": patch
"@commerce-klaus/typescript-sfcc": patch
---

Align type-aware test fixtures for `sfcc/no-string-equals`, `sfcc/no-empty-global`, and `sfcc/valid-require-path` with SFCC's JSDoc-typed JavaScript convention instead of plain `.ts` files, and stop testing ES module syntax rejection through a `.mjs` file since SFCC code is always plain `.js`. Also convert a `typescript-sfcc` test fixture simulating a cartridge script from `.ts` to `.js` with `// @ts-check` + JSDoc-style `require(...)`. No rule or runtime behavior changes.
