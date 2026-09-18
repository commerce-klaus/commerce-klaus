# Project configuration

Commerce Klaus packages can share project-wide SFCC settings from a
`commerce-klaus.config.ts` or `commerce-klaus.config.js` file. Put the file at
the workspace root; tools search from their working directory toward the
filesystem root.

Install the dedicated configuration package:

::: code-group

```bash [Vite+]
vp install -D @commerce-klaus/config
```

```bash [pnpm]
pnpm add -D @commerce-klaus/config
```

```bash [Yarn]
yarn add -D @commerce-klaus/config
```

```bash [npm]
npm install -D @commerce-klaus/config
```

:::

```ts [commerce-klaus.config.ts]
import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgesDir: "cartridges",
  siteTemplatePath: "sites/site_template",
  site: "RefArch",
})
```

JavaScript configuration uses the same shape:

```js [commerce-klaus.config.js]
export default {
  cartridgesDir: "cartridges",
  cartridgePath: ["app_custom", "app_storefront_base", "modules"],
}
```

Paths in the central file are resolved relative to that file. This makes the
configuration stable when a tool runs from a package or cartridge directory.

## Options

| Option               | Type       | Description                                                                       |
| -------------------- | ---------- | --------------------------------------------------------------------------------- |
| `cartridgesDir`      | `string`   | Directory containing the project cartridges.                                      |
| `cartridgePath`      | `string[]` | Explicit cartridge order. The first matching cartridge wins.                      |
| `siteTemplatePath`   | `string`   | Site-template root containing `sites/<site>/site.xml`.                            |
| `site`               | `string`   | Site identifier used to read `custom-cartridges` from `site.xml`.                 |
| `solutionConfigPath` | `string`   | Solution `jsconfig.json` or `tsconfig.json` used to infer cartridge order.        |
| `envCartridgePath`   | `string`   | Colon-separated cartridge order, matching the `SFCC_CARTRIDGE_PATH` value format. |

## Overrides

Existing package options and CLI flags remain supported. They override matching
values from the central file, so a test configuration can replace only its
cartridge path:

```ts [vitest.config.ts]
import { defineConfig } from "vitest/config"
import sfccVitest from "@commerce-klaus/vitest-sfcc"

export default defineConfig({
  plugins: [
    sfccVitest({
      cartridgePath: ["app_test", "app_custom", "app_storefront_base"],
    }),
  ],
})
```

Vite, Vitest, Babel, ESLint, and the TypeScript tooling discover the file
automatically. Resolver-based adapters also accept `configFile` with an explicit
path, or `false` to disable discovery for an isolated invocation.

The effective precedence is:

1. package option or CLI flag
2. `commerce-klaus.config.ts` or `commerce-klaus.config.js`
3. the package's existing environment and inference fallbacks

None of the existing configuration mechanisms are deprecated.

## Programmatic API

`@commerce-klaus/config` exports `defineConfig()`, `findCommerceKlausConfig()`,
`loadCommerceKlausConfig()`, and `resolveCommerceKlausConfig()` for custom
tooling. This keeps project configuration independent from the internal module
resolution implementation.
