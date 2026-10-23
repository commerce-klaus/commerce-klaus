# Choosing a package

Choose a package by the job it performs. Most SFCC projects should start with the **tools**. Add an **integration adapter** only when another build or test pipeline needs cartridge-aware modules. Use the **utilities** directly when building an integration of your own.

## Commerce Klaus tools

These packages provide direct feedback or commands in the everyday development workflow.

<!--@include: ../_partials/package-cards-tools.md-->

::: tip A sensible starting point

Begin with the ESLint config for immediate compatibility feedback. Add TypeScript for editor and CI guarantees, then add the Vitest integration when tests need to execute cartridge modules. The B2C CLI plugin provides a common command surface for type and project workflows.

:::

## Integration adapters

These packages connect Commerce Klaus module semantics to an existing transformation pipeline. They do not provide the SFCC test runtime.

<!--@include: ../_partials/package-cards-adapters.md-->

<!--@include: ../_partials/vite-integration-choice.md-->

## Utilities and shared foundations

Most projects consume these packages indirectly through the tools and adapters above. Import them directly when you need their focused API or are building another SFCC-aware integration.

<!--@include: ../_partials/package-cards-utilities.md-->

::: info Utilities are public, but not the default starting point

The utilities are supported public packages. They are separated here because typical projects get them through a higher-level Commerce Klaus tool rather than wiring them directly.

:::
