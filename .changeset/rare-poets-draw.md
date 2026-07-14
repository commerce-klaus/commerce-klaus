---
"@commerce-klaus/eslint-config-sfcc": patch
---

Refactor shared TypeScript parser-services access into a reusable internal utility for SFCC rules.

Migrate `sfcc/no-empty-global`, `sfcc/no-string-equals`, and `sfcc/valid-require-path` to use the shared type-aware utility while preserving existing fallback behavior when type information is unavailable.

Extend `sfcc/valid-require-path` fixture coverage for indirect `const` template-literal `require(...)` arguments.
