<!-- markdownlint-disable-file MD041 -->

::: warning Choose one Vite integration

Use [`@commerce-klaus/vitest-sfcc`](/packages/vitest-sfcc/) when cartridge code must run in
Vitest. Use [`@commerce-klaus/vite-plugin-sfcc-modules`](/packages/vite-plugin-sfcc-modules/)
when another Vite-based tool needs cartridge-aware module resolution without the test runtime.
The Vitest integration already includes the required resolution and transformation, so do not
configure both plugins in the same Vitest run.

:::
