[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/typescript-sfcc

TypeScript tooling for Salesforce Commerce Cloud cartridge projects. It provides cartridge-aware editor resolution, command-line type checking, and project-specific generated types while SFCC runtime code remains JavaScript with JSDoc.

## Highlights

- Resolves `dw/*`, `*/`, `~/`, cartridge aliases, and `module.superModule`
- Typechecks cartridges with the same behavior as the editor plugin
- Generates types for custom attributes, hooks, Custom APIs, and custom job steps with overridable chunk item types
- Validates hook registrations and statically detectable exports

## What Commerce Klaus adds

[The official Salesforce B2C Commerce IDE Extension](https://salesforcecommercecloud.github.io/b2c-developer-tooling/vscode-extension/)
is the preferred foundation for Script API IntelliSense and standard cartridge
module resolution in VS Code. The broader
[Salesforce B2C Developer Tooling](https://salesforcecommercecloud.github.io/b2c-developer-tooling/)
also bundles XSD schemas and offers XML validation through its CLI. Commerce
Klaus composes with these tools and adds generated project guarantees that can
also run outside the editor:

| Area                    | Commerce Klaus addition                                                                                | Practical benefit                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Project contracts       | Projects metadata, `hooks.json`, Custom API schemas, and `steptypes.json` into TypeScript declarations | Configuration and JavaScript implementation are checked together       |
| Super modules           | Resolves and types `module.superModule` chains                                                         | Cartridge overrides remain navigable and type-safe                     |
| Type checking           | Runs the cartridge-aware TypeScript compiler from the command line                                     | The same class of diagnostics can block CI without a VS Code extension |
| Registration validation | Checks hook descriptors, referenced scripts, and required CommonJS exports                             | Broken registrations fail before deployment                            |
| Shared tooling          | Reuses the same cartridge semantics across TypeScript, ESLint, Vite, Babel, and Vitest packages        | Local tools agree about which cartridge implementation wins            |

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

The plugin composes with the
[official Salesforce B2C Commerce VS Code extension](https://salesforcecommercecloud.github.io/b2c-developer-tooling/vscode-extension/).
Existing language-service resolutions from Salesforce take precedence; Commerce
Klaus fills unresolved modules and adds generated project declarations and
`module.superModule` support.

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
terminal output. Typechecks use the TypeScript compiler installed by the project,
including when invoked through the B2C CLI plugin.

The Salesforce extension provides editor IntelliSense but does not run a
project-wide TypeScript check. Keep `sfcc-ts-typecheck` in local and CI workflows
for reproducible diagnostics outside the editor.

The package API also exposes `cleanGeneratedTypes()` for removing only the four
project-specific `sfcc-*.generated.d.ts` outputs managed by Commerce Klaus. It
preserves synchronized Salesforce Script API types and unrelated declarations,
and accepts `dryRun: true` for a read-only preview.

## Documentation

See the [complete setup, CLI, and generated types reference](https://commerce-klaus.github.io/commerce-klaus/packages/typescript-sfcc/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
