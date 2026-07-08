[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/typescript-sfcc

TypeScript tooling for Salesforce Commerce Cloud cartridge projects.

The package currently ships two main entry points:

- a tsserver plugin that resolves SFCC-specific module patterns such as `~/...`, `*/...`, cartridge aliases, and `module.superModule`
- a CLI that typechecks cartridge projects with the same resolution behavior

## Install

```bash
pnpm add -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
```

## SFCC Script Types Setup

`@commerce-klaus/typescript-sfcc` is compatible with Salesforce `b2c-script-types` output.

For `dw/*` imports, the tool resolves types from a vendored workspace path:

- `.b2c-script-types/types/dw/*`

The path is calculated relative to each project config, so both setups are supported:

- `cartridges/jsconfig.json`
- `cartridges/<cartridge>/jsconfig.json`

Example workflow with the B2C Developer Tooling CLI:

```bash
b2c setup ide vscode-types --copy --force --output .b2c-script-types/jsconfig.generated.json
```

Notes:

- `sfcc-dts` is not required for `dw/*` resolution in this package.
- Keep `.b2c-script-types/types` available in the workspace before running `sfcc-ts-typecheck`.

Recommended `package.json` scripts:

```json
{
  "scripts": {
    "types:sfcc:sync": "sfcc-ts-sync-types --min-version 26.7.0",
    "types:sfcc:sync:force": "sfcc-ts-sync-types --force",
    "prepare": "pnpm types:sfcc:sync",
    "typecheck:cartridges": "sfcc-ts-typecheck"
  }
}
```

If your CI install uses `--ignore-scripts`, run `pnpm types:sfcc:sync` explicitly before `sfcc-ts-typecheck`.

## tsserver Plugin

Add the plugin to your cartridge `jsconfig.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@commerce-klaus/typescript-sfcc" }]
  }
}
```

## CLI

The package ships these CLI binaries:

- `sfcc-ts-typecheck`
- `sfcc-ts-sync-types`

Default behavior (no flags):

- searches from the current working directory upwards for `cartridges/jsconfig.json`
- if no `references` are present, it typechecks the given config itself

Basic calls:

```bash
pnpm exec sfcc-ts-typecheck
pnpm exec sfcc-ts-typecheck --project cartridges/jsconfig.json
pnpm exec sfcc-ts-typecheck --project cartridges/tsconfig.json
```

If your project config is outside the cartridges folder, pass the cartridges root explicitly:

```bash
pnpm exec sfcc-ts-typecheck --project config/tsconfig.cartridges.json --cartridges-dir cartridges
```

`package.json` example:

```json
{
  "scripts": {
    "typecheck:cartridges": "sfcc-ts-typecheck --project cartridges/tsconfig.json"
  }
}
```

Exit codes:

- `0`: no diagnostics
- `2`: diagnostics found
- `1`: runtime/config error (for example missing config file)

`sfcc-ts-sync-types` options:

- `--min-version X.Y.Z`: refreshes types if vendored version is older than required
- `--force`: always refreshes vendored types
- `--output <path>`: optional output path for generated `jsconfig` metadata

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
