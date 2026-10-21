---
"@commerce-klaus/eslint-config-sfcc": minor
---

Split `empty()` migration into two recommended warnings: `sfcc/prefer-explicit-empty-check` offers behavior-preserving replacements for known value types, while `sfcc/no-ambiguous-empty` asks for better JSDoc information instead of guessing. Keep `sfcc/no-empty-global` as an opt-in strict ban.
