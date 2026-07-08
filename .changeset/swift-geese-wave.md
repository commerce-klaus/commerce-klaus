---
"@commerce-klaus/typescript-sfcc": minor
---

Add `sfcc-ts-sync-types` CLI to sync vendored SFCC script types from `b2c-script-types` output.

Switch `dw/*` path mapping to `.b2c-script-types/types/dw/*` (relative to each project config) and remove the hardcoded `sfcc-dts` assumption.

Declare `@salesforce/b2c-cli` as a peer dependency and document recommended scripts for `prepare`, type sync, and cartridge typechecking.
