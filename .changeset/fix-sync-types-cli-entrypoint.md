---
"@commerce-klaus/typescript-sfcc": patch
---

Fix `sfcc-ts-sync-types` so it reliably executes when invoked via package-manager shims (for example `pnpm`/`.bin` entrypoints).

Previously, some shim invocation paths could fail the direct-execution guard and cause a silent no-op. The CLI now uses more robust entrypoint detection and path matching so sync runs consistently.
