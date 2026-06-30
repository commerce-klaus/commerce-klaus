---
"@commerce-klaus/typescript-sfcc": patch
---

Improve SFCC module resolution ergonomics by removing the need for explicit `*/` path mappings in cartridge configs.

- Keep existing `compilerOptions.paths` entries from project config and merge in generated SFCC paths instead of overwriting them.
- Ensure `*/...` imports continue to resolve in the shared SFCC module resolver used by both CLI typecheck and tsserver plugin.
- Add tests for `*/...` resolution in resolver and project typecheck flows.
