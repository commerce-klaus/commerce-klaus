[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/typescript-sfcc

TypeScript tooling for Salesforce Commerce Cloud cartridge projects. It provides cartridge-aware editor resolution, command-line type checking, and project-specific generated types while SFCC runtime code remains JavaScript with JSDoc.

## Highlights

- Resolves `dw/*`, `*/`, `~/`, cartridge aliases, and `module.superModule`
- Typechecks cartridges with the same behavior as the editor plugin
- Generates types for custom attributes, hooks, and Custom APIs
- Validates hook registrations and statically detectable exports

## Install

```bash
pnpm add -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
```

Enable the editor plugin in a cartridge `jsconfig.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@commerce-klaus/typescript-sfcc" }]
  }
}
```

Synchronize types and run the cartridge typecheck:

```bash
pnpm exec sfcc-ts-sync-types
pnpm exec sfcc-ts-typecheck
```

## Documentation

See the [complete setup, CLI, and generated types reference](https://commerce-klaus.github.io/commerce-klaus/packages/typescript-sfcc/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
