# Packages

Commerce Klaus covers the development loop around SFCC server-side JavaScript: static compatibility checks, cartridge-aware type information, and local module execution.

## Project-facing tools

| Package                                                                     | Use it for                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`@commerce-klaus/eslint-config-sfcc`](./eslint-config-sfcc/)               | Rhino compatibility and SFCC-specific correctness rules                |
| [`@commerce-klaus/typescript-sfcc`](./typescript-sfcc/)                     | Editor resolution, cartridge typechecking, and generated project types |
| [`@commerce-klaus/vite-plugin-sfcc-modules`](./vite-plugin-sfcc-modules/)   | SFCC module resolution in Vite and Vitest                              |
| [`@commerce-klaus/babel-plugin-sfcc-modules`](./babel-plugin-sfcc-modules/) | SFCC module rewriting in Babel-based pipelines                         |

## Shared foundation

[`@commerce-klaus/sfcc-module-resolver`](./sfcc-module-resolver/) is the common Node.js resolution core used by the project-facing packages. It is also public for authors building additional SFCC-aware tools.

## What is shared?

The packages agree on cartridge order and the meaning of these platform-specific patterns:

```js
require("*/cartridge/scripts/example")
require("~/cartridge/scripts/local")
require("app_core/cartridge/scripts/example")

const base = module.superModule
```

This keeps editor diagnostics, lint rules, typechecks, and local test execution aligned.
