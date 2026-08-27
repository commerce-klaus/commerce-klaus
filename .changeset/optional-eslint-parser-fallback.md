---
"@commerce-klaus/eslint-config-sfcc": patch
---

Make the ESLint fallback parser optional. The Oxlint preset and the package root no longer require `@typescript-eslint/parser`; install it only when using the `configs/eslint-after-oxlint` fallback.
