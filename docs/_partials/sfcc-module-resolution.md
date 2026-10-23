<!-- markdownlint-disable-file MD041 -->

SFCC resolves server-side modules in the context of an ordered **cartridge path**. Entries on the left have higher precedence, so the order is part of application behavior rather than a filesystem detail. See [Cartridges and cartridge paths](/guide/cartridges-and-cartridge-paths) for the central explanation.

- `*/cartridge/...` selects the first matching module in cartridge-path order.
- `~/cartridge/...` selects a module from the importing file's own cartridge.
- `<cartridge>/cartridge/...` selects a module from one named cartridge.
- `module.superModule` selects the next matching implementation after the current cartridge.
- `dw/*` refers to platform APIs and is not resolved from the project filesystem.

::: tip Prefer `~/` for local cartridge dependencies

Use `~/` when a dependency belongs to the importing file's own cartridge. Reserve `*/` for cases
where cartridge-path precedence should deliberately select the effective implementation.

:::
