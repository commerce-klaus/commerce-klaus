<!-- markdownlint-disable-file MD041 -->

A cartridge architecture is an explicit **project policy label**. It tells Commerce Klaus which
storefront conventions a cartridge intentionally follows; it is not inferred from the cartridge
name or directory structure.

<ArchitectureCards />

::: info Classification does not change cartridge precedence

Architecture assignments do not reorder the cartridge path, create dependencies between
cartridges, or change what SFCC deploys. They let individual tools apply architecture-specific
lint policies or select a focused subset while preserving the existing cartridge-path order.

:::
