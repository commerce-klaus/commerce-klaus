---
"@commerce-klaus/typescript-sfcc": minor
---

Add Custom API type generation. `sfcc-ts-sync-types` now scans `cartridge/rest-apis/**/api.json` files and their referenced OAS 3.0 `schema.yaml` contracts (via the shared `@commerce-klaus/sfcc-module-resolver` discovery helpers) to generate `.b2c-script-types/types/sfcc-custom-apis.generated.d.ts` with a `SfccCustomApis.Schemas` and `SfccCustomApis.Operations` namespace, so Custom API endpoint scripts can be typed via JSDoc `@type` annotations.
