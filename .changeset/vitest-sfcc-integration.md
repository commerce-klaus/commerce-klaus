---
"@commerce-klaus/vitest-sfcc": minor
---

Add cartridge-aware SFCC module execution and dependency mocking for Vitest.

The plugin transforms supported cartridge CommonJS patterns, resolves cartridge aliases and super modules, discovers hooks and job steps, and connects cartridge modules to the SFCC test runtime. It includes controller and job-step helpers, lazy cartridge fallbacks, relative and resolved-file mocks, and a public `@commerce-klaus/vitest-sfcc/runtime` entry point. The package is pre-1.0 and provides a migration path from proxyquire-based tests.
