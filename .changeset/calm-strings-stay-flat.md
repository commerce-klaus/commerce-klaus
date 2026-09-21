---
"@commerce-klaus/eslint-config-sfcc": patch
---

Add the recommended `sfcc/no-string-raw` rule to prevent Rhino `ConsString` values from leaking into Java-backed SFCC APIs, with an auto-fix for static tagged templates. Disable `unicorn/prefer-string-raw` because its suggestions are unsafe for affected SFCC Rhino versions.
