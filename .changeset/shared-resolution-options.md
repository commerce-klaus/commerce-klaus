---
"@commerce-klaus/sfcc-module-resolver": minor
"@commerce-klaus/vite-plugin-sfcc-modules": patch
"@commerce-klaus/vitest-sfcc": patch
---

Add a shared `SfccModuleResolutionOptions` type for SFCC-aware tooling integrations.

The Vite and Vitest adapters now derive their cartridge-resolution configuration from the shared resolver type. Their documentation also clarifies when to use module-graph resolution alone and when to use the complete Vitest runtime, transformation, and mocking integration.
