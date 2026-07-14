---
"@commerce-klaus/eslint-config-sfcc": patch
---

Harden `sfcc/no-string-equals` with stable fixture-based type-aware tests.

When TypeScript parser type information is available, keep reporting `string` receivers (including String augmentation cases) and skip clearly non-string receivers with custom `equals(...)` methods.

Without type information, keep the existing fallback behavior unchanged and continue reporting `.equals(...)` calls.
