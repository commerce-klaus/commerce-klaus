# Packages

Commerce Klaus covers the development loop around SFCC server-side JavaScript: static compatibility checks, cartridge-aware type information, and local module execution.

[Choose a package](/guide/choosing-a-package) for recommendations and a task-oriented adoption path.

## Commerce Klaus tools

These packages provide direct feedback or commands in the everyday development workflow.

<!--@include: ../_partials/package-cards-tools.md-->

## Integration adapters

These packages connect Commerce Klaus module semantics to an existing transformation pipeline.

<!--@include: ../_partials/package-cards-adapters.md-->

## Utilities and shared foundations

Most projects consume these public packages indirectly. Use them directly when building another SFCC-aware integration.

<!--@include: ../_partials/package-cards-utilities.md-->

## What is shared?

The packages agree on cartridge order and the meaning of these platform-specific patterns:

```js
require("*/cartridge/scripts/example")
require("~/cartridge/scripts/local")
require("app_core/cartridge/scripts/example")

const base = module.superModule
```

This keeps editor diagnostics, lint rules, typechecks, and local test execution aligned.
