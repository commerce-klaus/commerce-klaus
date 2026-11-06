---
"@commerce-klaus/typescript-sfcc": patch
---

Align generated custom-attribute types more closely with Salesforce Script API semantics: enum values expose their `value` property, and quantity attributes use `dw.value.Quantity` instead of `number`.
