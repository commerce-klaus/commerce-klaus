---
"@commerce-klaus/typescript-sfcc": patch
---

Fix SFCC compatibility typing in generated custom attribute declarations.

- restore CommonJS static member typing for `require("dw/..." )` by emitting compatibility `require` overloads from Salesforce `global.d.ts` types
- support real Salesforce `b2c-script-types` globals declared via `module dw`, not only synthetic `namespace dw` fixtures
- restore dynamic `dw.web.HttpParameterMap` property access such as `parameterMap.productId.value`
- add regression tests covering real `b2c-script-types` global declarations
