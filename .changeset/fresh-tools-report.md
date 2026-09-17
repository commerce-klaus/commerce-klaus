---
"@commerce-klaus/b2c-plugin": minor
"@commerce-klaus/typescript-sfcc": patch
---

Add a Salesforce B2C CLI plugin with `b2c klaus types check` and
`b2c klaus types sync` commands while keeping the existing standalone command
entry points available for project-local automation. The standalone binaries and
plugin now share oclif commands, structured JSON results, errors, and color-aware
human output over framework-independent typecheck and synchronization operations.
