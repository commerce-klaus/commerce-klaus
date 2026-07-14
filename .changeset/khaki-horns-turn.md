---
"@commerce-klaus/eslint-config-sfcc": patch
---

Make `sfcc/no-empty-global` type-aware suggestion narrowing more conservative for mixed union types.

When multiple value categories are present in the inferred type (for example string/object/nullable combinations), keep broad fallback suggestions instead of forcing a single replacement.

Add fixture-based coverage for the mixed union case.
