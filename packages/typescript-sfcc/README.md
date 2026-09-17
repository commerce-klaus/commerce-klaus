[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/typescript-sfcc

TypeScript tooling for Salesforce Commerce Cloud cartridge projects. It provides cartridge-aware editor resolution, command-line type checking, and project-specific generated types while SFCC runtime code remains JavaScript with JSDoc.

## Highlights

- Resolves `dw/*`, `*/`, `~/`, cartridge aliases, and `module.superModule`
- Typechecks cartridges with the same behavior as the editor plugin
- Generates types for custom attributes, hooks, Custom APIs, and custom job steps with overridable chunk item types
- Validates hook registrations and statically detectable exports

## Install

Salesforce Script API declarations are synchronized through the
[Salesforce B2C Developer Tooling CLI](https://salesforcecommercecloud.github.io/b2c-developer-tooling/).

```bash [pnpm]
pnpm add -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
```

```bash [yarn]
yarn add -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
```

```bash [npm]
npm install -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
```

```bash [Vite+]
vp install -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
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

```bash [pnpm]
pnpm exec sfcc-ts-sync-types
pnpm exec sfcc-ts-typecheck
```

```bash [yarn]
yarn exec sfcc-ts-sync-types
yarn exec sfcc-ts-typecheck
```

```bash [npm]
npm exec -- sfcc-ts-sync-types
npm exec -- sfcc-ts-typecheck
```

```bash [Vite+]
vp exec sfcc-ts-sync-types
vp exec sfcc-ts-typecheck
```

Both standalone commands use the same oclif command implementation as the B2C
CLI plugin, including `--help`, `--json`, consistent errors, and color-aware
terminal output.

## Documentation

See the [complete setup, CLI, and generated types reference](https://commerce-klaus.github.io/commerce-klaus/packages/typescript-sfcc/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
