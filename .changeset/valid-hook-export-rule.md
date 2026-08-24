---
"@commerce-klaus/eslint-config-sfcc": minor
---

Add `sfcc/valid-hook-export` rule. It requires a static CommonJS export for each Salesforce `dw.*` hook method registered for a file in the cartridge's `hooks.json`, surfacing the same check `sfcc-ts-typecheck` performs directly through ESLint (editors and lint-only CI steps).
