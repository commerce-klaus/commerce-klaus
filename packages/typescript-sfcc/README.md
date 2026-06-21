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

Run the cartridge typecheck from your project root:

```bash
pnpm exec sfcc-ts-typecheck --project cartridges/jsconfig.json
```

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
