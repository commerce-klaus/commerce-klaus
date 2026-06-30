---
"@commerce-klaus/babel-plugin-sfcc-modules": patch
"@commerce-klaus/vite-plugin-sfcc-modules": patch
---

Fix SFCC module path resolution stability across different working directories for Babel-based usage.

Improve Vite plugin test reliability by testing plugin hooks directly, so the test suite no longer depends on root-level Vite config wiring.
