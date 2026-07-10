---
"@commerce-klaus/typescript-sfcc": minor
---

Generate custom attribute typings for SFCC extensible objects from local metadata XML files under `sites/site_template/meta/*.xml`.

Extend the existing `b2c-script-types` sync flow with generated declarations for `ExtensibleObject.custom`, including schema-driven handling of enum values, enum multi-select via `select-multiple-flag`, and set-based attribute types.

Load the generated declarations consistently in both `sfcc-ts-typecheck` and the tsserver plugin so editor diagnostics and CLI diagnostics use the same custom attribute typing.
