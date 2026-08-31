# Oxlint and ESLint SFCC example

This compact example combines all three SFCC packages without duplicating the
larger example:

- Vite+ runs the Oxlint-compatible SFCC rules through `vp lint`.
- ESLint runs afterward with only the three fallback rules that Oxlint cannot
  parse or execute.
- `@commerce-klaus/typescript-sfcc` typechecks the cartridge and resolves SFCC
  module paths.
- `@commerce-klaus/vite-plugin-sfcc-modules` resolves the same paths in Vitest.

The Vite config contains the Oxlint setup directly because Vite+ uses Oxlint
internally. No separate `oxlint.config.mjs` is needed. A standard TypeScript
configuration covers Vite+'s TypeScript-Go check; `sfcc-ts-typecheck` provides
the complete SFCC-aware typecheck.

Run all checks with:

```bash
vp run build
```

The cartridge path is loaded from the `Example` site template. The Vitest test
uses it to resolve `module.superModule` from `app_custom` to `app_example`.
