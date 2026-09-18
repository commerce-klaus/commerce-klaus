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
configuration covers Vite+'s TypeScript-Go check; the Commerce Klaus B2C CLI
plugin provides the complete SFCC-aware typecheck through
`b2c klaus types check`.

The project-level `commerce-klaus.config.js` provides the cartridges directory,
solution config, site template, and selected site to the Vite plugin,
TypeScript tooling, and B2C CLI commands. The adapter configs therefore contain
only their tool-specific setup.

The example's `prepare` script links the workspace's
`@commerce-klaus/b2c-plugin` into its local Salesforce B2C CLI during dependency
installation. To refresh that development link manually, run `vp run prepare`.

Run all checks with:

```bash
vp run build
```

The cartridge path is loaded from the solution references in
`cartridges/jsconfig.json`. The Vitest test uses it to resolve
`module.superModule` from `app_custom` to `app_example`.
