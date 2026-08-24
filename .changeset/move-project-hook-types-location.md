---
"@commerce-klaus/typescript-sfcc": minor
---

Move the default `sfcc-hooks.d.ts` location from the workspace root to `cartridges/`, next to `jsconfig.json`, and add support for cartridge-specific `sfcc-hooks.d.ts` files (for example `cartridges/int_storepickup/sfcc-hooks.d.ts`) that are merged into the same global `SfccHooks` namespace.

Migration: move an existing workspace-root `sfcc-hooks.d.ts` into `cartridges/`.
