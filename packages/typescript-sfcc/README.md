[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/typescript-sfcc

TypeScript tooling for Salesforce Commerce Cloud cartridge projects.

The package currently ships two main entry points:

- a tsserver plugin that resolves SFCC-specific module patterns such as `~/...`, `*/...`, cartridge aliases, and `module.superModule`
- a CLI that typechecks cartridge projects with the same resolution behavior

## Install

```bash
pnpm add -D @commerce-klaus/typescript-sfcc typescript
```

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

The CLI binary is `sfcc-ts-typecheck`.

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

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
