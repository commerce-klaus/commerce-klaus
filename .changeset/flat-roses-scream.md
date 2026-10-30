---
"@commerce-klaus/eslint-config-sfcc": minor
---

Add an opt-in SFCC test preset for ESLint and Oxlint. The rules catch concurrent
tests sharing runtime state, eager SFCC module imports alongside runtime setup,
unmanaged access to SFCC test globals, runtime setup in hoisted Vitest mock
factories, and non-absolute exact-file mock paths without applying cartridge
language restrictions to tests.

Guard against native cartridge require calls and tilde imports outside configured
cartridges. Extend the opt-in file-extension rule to static value imports and
runtime mock identifiers, also exposing it through the test plugin. Import fixes
use shared resolution; context-dependent mock keys are reported without rewriting.

Report Proxyquire imports, require calls, and re-exports as migration warnings in
the test preset. Diagnostics point to loading sites, including aliases and chained
configuration, without automatically changing call-through or cache behavior.

Extend managed-global warnings to Vitest global stubs and static Reflect/Object
operations. Add opt-in runtime cleanup checks with suite-aware afterEach
recognition and an explicit externalCleanup option for central setup files.
Vitest mock resets and active-runtime replacement do not count as cleanup.

Recognize runtime bindings assigned in lifecycle hooks consistently across mock
path, extension, hoisting, and eager-import checks. Report SFCC imports executed
directly inside vi.hoisted(), and add opt-in no-stale-runtime-reference warnings
for active runtime instances captured before beforeEach replaces them.
