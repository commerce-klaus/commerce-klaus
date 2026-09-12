<!-- markdownlint-disable-file MD041 -->

SFCC resolves server-side modules in the context of an ordered **cartridge path**. Entries on the left have higher precedence, so the order is part of application behavior rather than a filesystem detail.

- `*/cartridge/...` selects the first matching module in cartridge-path order.
- `~/cartridge/...` selects a module from the importing file's own cartridge.
- `<cartridge>/cartridge/...` selects a module from one named cartridge.
- `module.superModule` selects the next matching implementation after the current cartridge.
- `dw/*` refers to platform APIs and is not resolved from the project filesystem.
