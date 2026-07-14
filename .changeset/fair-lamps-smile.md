---
"@commerce-klaus/eslint-config-sfcc": patch
---

Improve `sfcc/no-empty-global` suggestions for nullable object references.

- add an extra `!value` suggestion for identifiers and member expressions when a null or nullable object reference check may be appropriate
- clarify in the rule documentation when a nullable reference check is a reasonable replacement for `empty(...)`
- keep the existing explicit suggestions for strings, arrays, plain objects, and SFCC collections
