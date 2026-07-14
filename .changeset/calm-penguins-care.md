---
"@commerce-klaus/typescript-sfcc": patch
---

Fix SFCC typing regressions introduced by generated custom attribute declarations.

- restore CommonJS static member typing for `require("dw/..." )` by emitting `require` overloads based on global `dw` namespace types
- restore dynamic `dw.web.HttpParameterMap` property access (for example `parameterMap.productId.value`) with an index signature augmentation
- add regression tests for both compatibility behaviors
