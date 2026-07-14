---
"@commerce-klaus/eslint-config-sfcc": patch
---

Fix `sfcc/no-empty-global` to report only true environment-global `empty()` calls.

- ignore shadowed/local `empty` identifiers (for example function declarations and parameters)
- keep reporting SFCC global `empty()` usage with the existing suggestions
- add regression tests for local shadowing cases
