---
"@commerce-klaus/eslint-config-sfcc": minor
---

Add fixture coverage for `sfcc/no-string-equals` to validate string type-alias receivers in type-aware mode.

This protects against regressions where `type Alias = string` values using `.equals(...)` might be missed.
