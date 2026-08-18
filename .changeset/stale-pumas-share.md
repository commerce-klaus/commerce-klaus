---
"@commerce-klaus/sfcc-module-resolver": minor
"@commerce-klaus/vite-plugin-sfcc-modules": patch
"@commerce-klaus/babel-plugin-sfcc-modules": patch
---

Centralize cartridge root resolution in `@commerce-klaus/sfcc-module-resolver` and reuse it in both plugin packages.

## What changed

- Added shared helpers in resolver:
  - `resolveCartridgesBasePath(basePath, cwd, containingFile?)`
  - `resolveCartridgeRoots(options)`
- Refactored `@commerce-klaus/vite-plugin-sfcc-modules` to use shared cartridge root resolution.
- Refactored `@commerce-klaus/babel-plugin-sfcc-modules` to use shared cartridge root resolution.
- Added resolver tests for base path fallback and shared root resolution.
- Updated resolver documentation with the new shared APIs.

## Why

Both plugins had near-identical logic for resolving base paths and cartridge roots. This removes duplication and ensures consistent behavior across Babel and Vite integrations.
