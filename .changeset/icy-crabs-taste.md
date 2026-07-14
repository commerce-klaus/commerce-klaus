---
"@commerce-klaus/eslint-config-sfcc": patch
---

Add a new `sfcc/no-string-equals` rule to disallow Java-style `.equals(...)` calls and suggest strict equality (`===`) instead.

When TypeScript parser type information is available, only report calls for string-like receivers and skip clearly non-string receivers.

Without TypeScript parser type information, keep the existing strict fallback behavior and report `.equals(...)` calls.
