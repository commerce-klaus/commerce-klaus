[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/b2c-plugin

Commerce Klaus commands for the
[Salesforce B2C CLI](https://salesforcecommercecloud.github.io/b2c-developer-tooling/).

`@commerce-klaus/typescript-sfcc` is a peer dependency so the editor plugin and
B2C CLI commands use the same project-level version.

## Install

```bash [pnpm]
pnpm add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [yarn]
yarn add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [npm]
npm install -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [Vite+]
vp install -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

Register the project-local plugin after dependency installation:

```json
{
  "scripts": {
    "prepare": "b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install"
  }
}
```

Run the `prepare` script to refresh the link after changing the plugin locally:

```bash [pnpm]
pnpm run prepare
```

```bash [yarn]
yarn run prepare
```

```bash [npm]
npm run prepare
```

```bash [Vite+]
vp run prepare
```

## Typecheck cartridges

```bash
b2c klaus types check
b2c klaus types check --project cartridges/jsconfig.json
```

The command uses the same SFCC-aware module resolution and diagnostics as
`sfcc-ts-typecheck` from `@commerce-klaus/typescript-sfcc`.

## Synchronize types

```bash
b2c klaus types sync
b2c klaus types sync --force --min-version 26.7.0
```

This runs Salesforce's Script API type synchronization and then generates
project-specific types for custom attributes, hooks, Custom APIs, and job steps.

## Check type status

```bash
b2c klaus types status
b2c klaus types status --min-version 26.7.0 --json
```

The command checks whether Salesforce Script API types are present and meet the
optional minimum version. It renders the expected project-specific declarations
without writing files and reports missing, stale, current, and unnecessary
outputs. A missing or stale output produces exit code `2` for CI.

## Inspect a project

```bash
b2c klaus inspect
b2c klaus inspect --cartridge-path app_custom:app_storefront_base --json
```

The command reports the effective cartridge order and the resolved hooks, job
steps, and Custom APIs. Use JSON output for CI or editor integrations.

## Visualize project relationships

```bash
b2c klaus graph
b2c klaus graph --module '*/cartridge/models/product'
b2c klaus graph --format dot > sfcc-project.dot
```

The graph connects cartridge precedence, `module.superModule` chains, hooks,
job steps, and Custom API schemas. Use `--json` for structured graph data or
Graphviz DOT output for external visualization.

## Explain module resolution

```bash
b2c klaus resolve '*/cartridge/scripts/example'
b2c klaus resolve '~/cartridge/scripts/example' \
  --from cartridges/app_custom/cartridge/controllers/Home.js
```

Wildcard resolution also reports every matching candidate in cartridge-path
order, making overrides visible.

## Diagnose a project

```bash
b2c klaus doctor
b2c klaus doctor --cartridge-path app_custom:app_storefront_base --json
```

The command checks that the cartridges directory and explicitly configured
cartridges exist. It also warns about entries that do not contain a
`cartridge/` directory and exits with a non-zero status when errors are found.

## Validate project contracts

```bash
b2c klaus validate
b2c klaus validate --cartridge-path app_custom:app_storefront_base --json
```

The command validates hook registrations, job step definitions, and Custom API
contracts. Missing scripts, modules, schemas, and operations are errors;
registrations hidden by cartridge precedence are warnings. Validation errors
produce a non-zero exit status for CI.

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/b2c-plugin
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/b2c-plugin
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/b2c-plugin
