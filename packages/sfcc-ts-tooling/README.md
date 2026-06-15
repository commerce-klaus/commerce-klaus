# sfcc-ts-tooling

TypeScript tooling for Salesforce Commerce Cloud cartridge projects.

The package currently ships two main entry points:

- a tsserver plugin that resolves SFCC-specific module patterns such as `~/...`, `*/...`, cartridge aliases, and `module.superModule`
- a CLI that typechecks cartridge projects with the same resolution behavior

## Install

```bash
pnpm add -D sfcc-ts-tooling typescript
```

## tsserver Plugin

Add the plugin to your cartridge `jsconfig.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "sfcc-ts-tooling" }]
  }
}
```

## CLI

Run the cartridge typecheck from your project root:

```bash
pnpm exec sfcc-ts-typecheck --project cartridges/jsconfig.json
```
