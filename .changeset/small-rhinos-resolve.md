---
"@commerce-klaus/vitest-sfcc": patch
---

Resolve Vite root-relative marked cartridge URLs against the resolved project
root when loading and transforming CommonJS modules. This prevents filesystem
ENOENT errors for dynamic cartridge imports and preserves Super Module lookup,
while retaining existing absolute filesystem paths.
