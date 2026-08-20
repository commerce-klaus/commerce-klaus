---
"@commerce-klaus/eslint-config-sfcc": patch
---

Align type-aware test fixtures for `sfcc/no-string-equals`, `sfcc/no-empty-global`, and `sfcc/valid-require-path` with SFCC's JSDoc-typed JavaScript convention instead of plain `.ts` files, and stop testing ES module syntax rejection through a `.mjs` file since SFCC code is always plain `.js`. No rule behavior changes.
