---
"@commerce-klaus/eslint-config-sfcc": patch
---

Improve `sfcc/valid-require-path` with conservative type-aware validation for indirect `require(...)` calls.

When TypeScript parser type information is available, identifier arguments with an exact string-literal type are validated like direct string literals.

Without type information (or for non-literal/ambiguous identifier types), keep existing behavior unchanged and continue to ignore dynamic `require(...)` arguments.

Add dedicated fixture-based tests and documentation for the new behavior.
