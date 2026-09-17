# @commerce-klaus/b2c-plugin

Commerce Klaus commands for the Salesforce B2C CLI.

`@commerce-klaus/typescript-sfcc` is a peer dependency so the editor plugin and
B2C CLI commands use the same project-level version.

## Install

```bash
pnpm add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

Register the project-local plugin after dependency installation:

```json
{
  "scripts": {
    "prepare": "b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install"
  }
}
```

Run `pnpm prepare` to refresh the link after changing the plugin locally.

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
