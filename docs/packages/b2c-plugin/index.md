# @commerce-klaus/b2c-plugin

Run Commerce Klaus development tools through the
[Salesforce B2C CLI](https://salesforcecommercecloud.github.io/b2c-developer-tooling/).

The plugin is a thin command adapter. Type checking, generated declarations,
and SFCC module resolution remain implemented by
`@commerce-klaus/typescript-sfcc`, so the B2C CLI and standalone commands have
the same behavior. The package is a peer dependency so the editor plugin and
B2C CLI commands always use the same compatible project-level version.

## Install

Install the B2C CLI and TypeScript tooling in the project, then register the
project-local plugin during the package manager's `prepare` lifecycle:

::: code-group

```bash [pnpm]
pnpm add -D @commerce-klaus/b2c-plugin @salesforce/b2c-cli @commerce-klaus/typescript-sfcc typescript
```

```bash [yarn]
yarn add -D @commerce-klaus/b2c-plugin @salesforce/b2c-cli @commerce-klaus/typescript-sfcc typescript
```

```bash [npm]
npm install -D @commerce-klaus/b2c-plugin @salesforce/b2c-cli @commerce-klaus/typescript-sfcc typescript
```

```bash [Vite+]
vp install -D @commerce-klaus/b2c-plugin @salesforce/b2c-cli @commerce-klaus/typescript-sfcc typescript
```

:::

```json [package.json]
{
  "scripts": {
    "prepare": "b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install"
  }
}
```

The package manager runs `prepare` after dependency installation. When the
linked plugin changes without an install, run the script manually:

::: code-group

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

:::

Confirm that the plugin is available:

::: code-group

```bash [pnpm]
pnpm exec b2c plugins
```

```bash [yarn]
yarn exec b2c plugins
```

```bash [npm]
npm exec -- b2c plugins
```

```bash [Vite+]
vp exec b2c plugins
```

:::

## Synchronize types

Synchronize Salesforce Script API declarations and generate project-specific
types for custom attributes, hooks, Custom APIs, and job steps:

::: code-group

```bash [pnpm]
pnpm exec b2c klaus types sync
```

```bash [yarn]
yarn exec b2c klaus types sync
```

```bash [npm]
npm exec -- b2c klaus types sync
```

```bash [Vite+]
vp exec b2c klaus types sync
```

:::

Available options:

```text
--force
--min-version <version>
--output <path>
--site-template-path <path>
--project-directory <path>
```

The command delegates Salesforce declaration generation to `b2c setup ide
vscode-types` before generating the Commerce Klaus declarations.

## Typecheck cartridges

Run the cartridge-aware TypeScript checker:

::: code-group

```bash [pnpm]
pnpm exec b2c klaus types check
```

```bash [yarn]
yarn exec b2c klaus types check
```

```bash [npm]
npm exec -- b2c klaus types check
```

```bash [Vite+]
vp exec b2c klaus types check
```

:::

By default, the command searches from the current directory upward for
`cartridges/jsconfig.json`. Explicit paths are also supported:

::: code-group

```bash [pnpm]
pnpm exec b2c klaus types check \
  --project cartridges/tsconfig.json \
  --cartridges-dir cartridges
```

```bash [yarn]
yarn exec b2c klaus types check \
  --project cartridges/tsconfig.json \
  --cartridges-dir cartridges
```

```bash [npm]
npm exec -- b2c klaus types check \
  --project cartridges/tsconfig.json \
  --cartridges-dir cartridges
```

```bash [Vite+]
vp exec b2c klaus types check \
  --project cartridges/tsconfig.json \
  --cartridges-dir cartridges
```

:::

Use `--project-directory <path>` when invoking the command outside the project
root. `--working-directory` is accepted as an alias.

Both commands support B2C CLI's standard `--json` flag for automation:

::: code-group

```bash [pnpm]
pnpm exec b2c klaus types check --json
pnpm exec b2c klaus types sync --json
```

```bash [yarn]
yarn exec b2c klaus types check --json
yarn exec b2c klaus types sync --json
```

```bash [npm]
npm exec -- b2c klaus types check --json
npm exec -- b2c klaus types sync --json
```

```bash [Vite+]
vp exec b2c klaus types check --json
vp exec b2c klaus types sync --json
```

:::

## Standalone commands

The original project-local commands remain available:

::: code-group

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

:::

They are useful in CI environments where every executable must be represented
directly by the project lockfile rather than an installed B2C CLI plugin.
