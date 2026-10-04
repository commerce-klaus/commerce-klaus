---
"@commerce-klaus/typescript-sfcc": patch
---

Type `html` custom attributes as `dw.content.MarkupText` instead of `string`, matching what the Script API returns at runtime. Code that reads such an attribute can call `getMarkup()` and `getSource()` without a cast.
