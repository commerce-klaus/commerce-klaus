---
"@commerce-klaus/eslint-config-sfcc": minor
"@commerce-klaus/sfcc-module-resolver": minor
---

Add an opt-in generated-types ESLint preset that requires effective job step, Salesforce system hook, and Custom API handler exports to use their generated function signatures. Custom API success values passed to `RESTResponseMgr.createSuccess()` also use the generated operation response type. The rules suggest exact missing or replacement annotations. Expose the shared resolver query used to map effective job step metadata back to a script file.
