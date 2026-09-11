---
"@commerce-klaus/eslint-config-sfcc": patch
---

Only suggest generated hook types that exist in the synchronized
`typescript-sfcc` hook declarations, avoiding invalid aliases for OCAPI and
unsupported system hooks.
