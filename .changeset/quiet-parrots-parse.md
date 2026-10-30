---
"@commerce-klaus/eslint-config-sfcc": patch
---

Prevent prefer-generated-custom-api-types from crashing on variables declared
without an initializer when tracing JSON.parse inputs or RESTResponseMgr calls.
Unknown sources remain ignored in both ESLint and Oxlint.
