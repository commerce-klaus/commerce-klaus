---
"@commerce-klaus/eslint-config-sfcc": patch
---

Improve `sfcc/no-empty-global` with type-aware suggestion narrowing when TypeScript parser type information is available.

Add stable fixture-based tests (with a dedicated `tsconfig.json`) to verify typed `empty(...)` suggestions for object-like and string values.

Keep existing fallback behavior unchanged when type information is not available.
