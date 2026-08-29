# Getting started

Commerce Klaus is a set of focused packages. Adopt only the parts your project needs, or combine them into one consistent SFCC development workflow.

## Requirements

- Node.js 22.12 or newer
- An SFCC cartridge project
- pnpm, npm, or Yarn

## Recommended setup

Start with static runtime checks and cartridge-aware types:

```bash
pnpm add -D eslint typescript @salesforce/b2c-cli \
  @commerce-klaus/eslint-config-sfcc \
  @commerce-klaus/typescript-sfcc
```

Add the recommended ESLint flat config:

```js
// eslint.config.js
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(sfcc.configs.recommended)
```

Enable cartridge-aware TypeScript resolution:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@commerce-klaus/typescript-sfcc" }]
  }
}
```

Synchronize Salesforce types and check the cartridges:

```bash
pnpm exec sfcc-ts-sync-types
pnpm exec sfcc-ts-typecheck
```

## Add local module resolution

Choose the adapter that matches the tool running your server-side code:

- Use the [Vite plugin](/packages/vite-plugin-sfcc-modules/) for Vite and Vitest.
- Use the [Babel plugin](/packages/babel-plugin-sfcc-modules/) for existing Babel-based tests and tooling.

Both use the same resolver core, so `*/`, `~/`, cartridge aliases, and `module.superModule` follow the same ordering rules.

## Next step

[Choose the packages for your workflow →](/guide/choosing-a-package)
