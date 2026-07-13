---
"@commerce-klaus/typescript-sfcc": minor
---

Extend generated SFCC custom attribute typings to cover `dw.object.SystemObjectMgr` and `dw.object.CustomObjectMgr`, as well as per-object attribute interfaces derived from local metadata XML.

This adds typed overloads for system object and custom object creation, lookup, and query methods so both managers return the matching object shape for known metadata-backed types.
