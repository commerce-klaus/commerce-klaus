# Getting started

Commerce Klaus is a set of focused packages. Adopt only the parts your project needs, or combine them into one consistent SFCC development workflow.

## Requirements

- Node.js 22.12 or newer
- An SFCC cartridge project
- pnpm, npm, or Yarn

## Recommended setup

Start with static runtime checks and cartridge-aware types:

::: code-group

```bash [pnpm]
pnpm add -D eslint typescript @salesforce/b2c-cli \
  @commerce-klaus/eslint-config-sfcc \
  @commerce-klaus/typescript-sfcc
```

```bash [yarn]
yarn add -D eslint typescript @salesforce/b2c-cli \
  @commerce-klaus/eslint-config-sfcc \
  @commerce-klaus/typescript-sfcc
```

```bash [npm]
npm install -D eslint typescript @salesforce/b2c-cli \
  @commerce-klaus/eslint-config-sfcc \
  @commerce-klaus/typescript-sfcc
```

:::

Add the recommended ESLint flat config:

```js{2,4} [eslint.config.js]
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(sfcc.configs.recommended)
```

For a faster lint path, Commerce Klaus also exposes its supported SFCC and SiteGenesis rules through Oxlint's JavaScript plugin API:

```bash [pnpm]
pnpm add -D oxlint @commerce-klaus/eslint-config-sfcc
```

```js [oxlint.config.mjs]
import sfcc from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"

export default sfcc
```

Oxlint cannot run the three rules whose input is invalid JavaScript syntax. Projects that need those checks can follow Oxlint with the minimal [ESLint fallback](/packages/eslint-config-sfcc/#eslint-after-oxlint) instead of running the complete ESLint preset twice.

Enable cartridge-aware TypeScript resolution:

```json{3} [cartridges/jsconfig.json]
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

## Add SFCC-aware unit tests

Use the dedicated Vitest integration when tests need to execute cartridge code:

::: code-group

```bash [pnpm]
pnpm add -D vitest @commerce-klaus/vitest-sfcc
```

```bash [yarn]
yarn add -D vitest @commerce-klaus/vitest-sfcc
```

```bash [npm]
npm install -D vitest @commerce-klaus/vitest-sfcc
```

:::

Configure the same cartridge path used by the application:

```ts [vitest.config.ts]
import sfccVitest from "@commerce-klaus/vitest-sfcc"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: "./cartridges",
      cartridgePath: ["app_custom", "app_storefront_base"],
    }),
  ],
})
```

The plugin loads CommonJS cartridge modules with SFCC-aware resolution and provides controlled platform modules, globals, dependency mocks, and harnesses for controllers, hooks, and job steps. See the [Vitest integration guide](/packages/vitest-sfcc/) for runtime setup and test examples.

## Add local module resolution

Choose the adapter that matches the tool running your server-side code:

- Use the [Vitest plugin](/packages/vitest-sfcc/) for unit tests that execute cartridge code.
- Use the [Vite plugin](/packages/vite-plugin-sfcc-modules/) when another Vite-based tool needs cartridge-aware module resolution without the test runtime.
- Use the [Babel plugin](/packages/babel-plugin-sfcc-modules/) for existing Babel-based tests and tooling.

These integrations use the same resolver core, so `*/`, `~/`, cartridge aliases, and `module.superModule` follow the same ordering rules. Do not configure the Vite and Vitest plugins together; the Vitest package already includes the required module resolution.

## Complete example

See the [ESLint, TypeScript, and Vitest SFCC example](https://github.com/commerce-klaus/commerce-klaus/tree/main/examples/eslint-typescript-sfcc) for a runnable two-cartridge setup. It demonstrates a shared cartridge path loaded from the site template, generated SFCC types, custom attributes, hooks, a Custom API, cartridge overrides, and the SFCC-aware Vitest runtime.

For a smaller Vite+ setup, see the [Oxlint and ESLint SFCC example](https://github.com/commerce-klaus/commerce-klaus/tree/main/examples/oxlint-eslint-sfcc). It runs the Oxlint-compatible SFCC rules through Vite+ and follows them with the minimal ESLint fallback while using the same TypeScript and Vite module resolution.

## Next step

[Choose the packages for your workflow →](/guide/choosing-a-package)
