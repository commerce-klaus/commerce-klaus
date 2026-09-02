[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/eslint-config-sfcc

Shareable ESLint flat config for Salesforce Commerce Cloud (SFCC) projects.

This package continues `@jenssimon/eslint-config-sfcc` under the [Commerce Klaus](https://github.com/commerce-klaus) organization.

## Modern JavaScript where SFCC supports it

This config is not an ES5 style guide. Its goal is to let SFCC projects use the most modern, idiomatic JavaScript that is known to run reliably on the platform, while catching unsupported features before deployment.

::: tip Compatibility policy

Write modern JavaScript by default. A feature is restricted only when SFCC/Rhino does not support it reliably or when it conflicts with an SFCC-specific runtime contract.

:::

| Area                       | Policy                                       | Examples                                                                                          |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Verified modern JavaScript | Use it                                       | `const`/`let`, arrow functions, destructuring, template literals, generators, `for...of`          |
| Standard library APIs      | Use APIs verified on supported SFCC versions | `Array.from`, `String.prototype.includes`, `Object.values`, `Number.isFinite`                     |
| Known runtime gaps         | Report before the code reaches a sandbox     | classes, default parameters, spread syntax, `Promise`, dynamic `import()`, unsupported builtins   |
| SFCC runtime contracts     | Prefer platform-compatible patterns          | CommonJS modules, valid cartridge paths, public Custom API exports, registered hook exports       |
| Rhino-specific behavior    | Apply targeted compatibility rules           | safe `const` usage, loop declarations, repeated names in nested blocks                            |
| Legacy or ambiguous syntax | Reject or migrate to standard JavaScript     | `.ds` files, E4X-like markup, Rhino import globals, `empty(...)`, Java-style `String.equals(...)` |

ES5 code remains valid, but it is the compatibility floor, not the target style.

::: details Verified modern syntax and APIs

- **Language syntax:** `const` and `let`, arrow functions, destructuring, template literals, generator functions, exponentiation, and `for...of`
- **Array:** `Array.from`, `Array.of`, `Array.prototype.find`, `Array.prototype.findIndex`, and `Array.prototype.includes`
- **String:** `String.raw`, `String.fromCodePoint`, and the `includes`, `startsWith`, `endsWith`, `repeat`, `padStart`, and `padEnd` prototype methods
- **Object:** `Object.assign`, `Object.values`, and `Object.entries`
- **Number:** `Number.isFinite`, `Number.isNaN`, `Number.isSafeInteger`, `Number.parseInt`, and `Number.parseFloat`

The rule configuration and integration tests define the compatibility contract. Features outside this verified set may still be restricted when the sandbox cannot execute them reliably.

:::

## Recommended Config

### Install

::: code-group

```bash [pnpm]
pnpm add -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [yarn]
yarn add -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [npm]
npm install -D eslint @commerce-klaus/eslint-config-sfcc
```

:::

### Use in `eslint.config.js`

```js{2,6} [eslint.config.js]
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  // ...
  sfcc.configs.recommended,
)
```

By default, JavaScript files under `cartridges/` are linted. Client-side and static asset folders are excluded.

### Storefront architecture presets

Storefront presets are policy overlays that describe which controller architecture a project uses. Compose one after `recommended`:

They do not change the JavaScript compatibility baseline: modern syntax and standard library APIs supported by SFCC remain allowed in every storefront preset.
`sitegenesis/no-global-require` also remains enabled in every preset because the rule limits itself to files under `cartridge/controllers/`.

```js{5-6} [eslint.config.js]
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  sfcc.configs.recommended,
  sfcc.configs["storefront-next"],
)
```

| Preset                    | Enabled architecture rules                                                             |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `storefront-next`         | `no-controllers`, `no-forms`, `no-isml-rendering`, `no-pipeline-api`, `no-sfra-server` |
| `pwa`                     | `no-controllers`, `no-forms`, `no-isml-rendering`, `no-pipeline-api`, `no-sfra-server` |
| `sfra`                    | `no-pipeline-api`                                                                      |
| `sitegenesis-controllers` | `no-pipeline-api`, `no-sfra-server`                                                    |
| `sitegenesis-pipelines`   | `no-sfra-server`                                                                       |

`pwa` and `storefront-next` currently enforce the same headless boundaries. They have separate semantic names so their policies can evolve independently as their platform contracts diverge.

The `sitegenesis-pipelines` preset applies to JavaScript only. It is the only preset that permits access to `dw/system/Pipeline`; all other presets reject pipeline execution. ESLint cannot validate pipeline XML files.

#### Restrict a preset to selected cartridges

Use `createStorefrontConfig()` when a repository contains multiple storefront architectures:

```js{2,7-14} [eslint.config.js]
import { defineConfig } from "eslint/config"
import sfcc, { createStorefrontConfig } from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  sfcc.configs.recommended,
  createStorefrontConfig("sitegenesis-controllers", {
    cartridges: ["app_sitegenesis"],
  }),
  createStorefrontConfig("pwa", {
    cartridges: ["app_pwa", "int_pwa_backend"],
  }),
)
```

The helper accepts `cartridgesDir`, `cartridges`, and `files`. Explicit `files` globs take precedence over generated cartridge globs. Because each overlay both enables its own policy and disables incompatible controller rules, later presets can safely override `recommended` for their selected files.

### Compatibility with other recommended configs

The recommended config deliberately disables selected rules from commonly used ESLint presets when they suggest syntax, APIs, or module patterns that SFCC/Rhino does not support. This allows you to combine the SFCC config with those presets without forcing otherwise valid server-side SFCC code into incompatible modern JavaScript patterns.

The compatibility overrides cover:

- **ESLint recommended and core rules:** disables rules such as `object-shorthand`, `prefer-object-spread`, `prefer-rest-params`, and `prefer-spread` that can suggest unsupported syntax or APIs. The core `prefer-const` rule is replaced by SFCC-aware rules that account for Rhino's scoping behavior.
- **`eslint-plugin-unicorn`:** disables modern syntax and API preferences such as `prefer-at`, `prefer-module`, `prefer-spread`, and `prefer-string-replace-all`, as well as rules whose fixes or assumptions are unsafe for Rhino and SFCC APIs.
- **`typescript-eslint`:** disables `@typescript-eslint/no-require-imports` because SFCC server-side modules use CommonJS `require()`.
- **`eslint-plugin-sonarjs`:** disables `sonarjs/no-implicit-global` because its assumptions conflict with SFCC's server-side module environment.

These overrides only take effect for rules enabled by another config in your ESLint setup; this package does not otherwise enable the external presets.

### Use with Oxlint

Oxlint can run the included `sfcc` and `sitegenesis` plugins through its alpha JavaScript plugin API. Create an `oxlint.config.mjs` file that exports the included preset:

```js{1,3} [oxlint.config.mjs]
import sfcc from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"

export default sfcc
```

The preset loads both plugins and enables the supported SFCC and SiteGenesis rules. `sfcc/no-ds-files` is excluded because Oxlint ignores `.ds` files. `sfcc/no-e4x-syntax` and `sfcc/no-type-annotations` are excluded because their invalid JavaScript syntax causes Oxlint parser errors before JavaScript plugins can run.

For custom rule severities, import the rule record directly:

```js{1,7} [oxlint.config.mjs]
import sfcc, { oxlintRules } from "@commerce-klaus/eslint-config-sfcc"

export default {
  lint: {
    ...sfcc.lint,
    rules: {
      ...oxlintRules,
      "sfcc/prefer-const": "warn",
    },
  },
}
```

Rules use their syntax-based behavior in Oxlint. Oxlint JavaScript plugins do not provide TypeScript parser services, so type-aware refinements are unavailable.

### ESLint after Oxlint

Run ESLint after Oxlint to cover only the three rules that Oxlint cannot run: `sfcc/no-ds-files`, `sfcc/no-e4x-syntax`, and `sfcc/no-type-annotations`.

This optional fallback requires `@typescript-eslint/parser`:

::: code-group

```bash [pnpm]
pnpm add -D @typescript-eslint/parser
```

```bash [yarn]
yarn add -D @typescript-eslint/parser
```

```bash [npm]
npm install -D @typescript-eslint/parser
```

:::

```js{2,4} [eslint.config.js]
import { defineConfig } from "eslint/config"
import eslintAfterOxlint from "@commerce-klaus/eslint-config-sfcc/configs/eslint-after-oxlint"

export default defineConfig(eslintAfterOxlint)
```

This config deliberately does not enable the Oxlint-compatible rules, so the second lint pass does not duplicate their diagnostics. The subpath also exports `createEslintAfterOxlintConfig()` when the cartridge path, file globs, or ignored paths differ from the defaults.

### Customize with shared SFCC settings

By default, `sfcc/valid-require-path` validates path patterns only and allows bare `server` requires.

Use `createRecommendedConfig({ sfcc: ... })` to define shared SFCC plugin options centrally. These values are exposed through ESLint `settings.sfcc`, so future `sfcc/*` rules can reuse them without adding per-rule options.

```js{2,6-19} [eslint.config.js]
import { defineConfig } from "eslint/config"
import { createRecommendedConfig } from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  createRecommendedConfig({
    cartridgesDir: "cartridges",
    sfcc: {
      // Optional: allow additional bare module ids
      allowBareModules: ["server", "proxyquire"],
      // Optional: verify cartridgeName/* plus */* and ~/* against filesystem
      checkCartridgeExists: true,
      // Optional: explicit cartridge order for */* lookup (otherwise folders in cartridgesDir are used)
      cartridgePath: ["app_storefront", "modules", "app_custom"],
      // Optional: path to site template directory (defaults to sites/site_template when site is set)
      siteTemplatePath: "sites/site_template",
      // Optional: site id under <siteTemplatePath>/sites/<site>/site.xml
      site: "example",
    },
  }),
)
```

### Register plugins manually

The recommended config already registers both built-in plugins. Register them manually only when composing individual rules without the preset.

```js{2,5-13} [eslint.config.js]
import { defineConfig } from "eslint/config"
import { sfcc as sfccPlugin, sitegenesis } from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig({
  plugins: {
    sfcc: sfccPlugin,
    sitegenesis,
  },
  rules: {
    "sfcc/prefer-const": "error",
    "sitegenesis/no-global-require": "error",
  },
})
```

## Compatibility Guide

Use this section to decide whether a pattern is safe on SFCC, requires a targeted lint fix, or must be migrated before ESLint can parse it.

### Quick reference

| Pattern                                             | Result       | Recommended action                                                                                     |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `XML` and `XMLList` identifiers                     | Allowed      | Constructor-style references remain available.                                                         |
| Static JSX/E4X-like markup                          | Lint error   | Convert it to `XML(\`...\`)`; see [`sfcc/no-e4x-syntax`](rules/sfcc/no-e4x-syntax.md).                 |
| Dynamic JSX/E4X-like markup                         | Lint error   | Refactor manually; no automatic conversion is offered.                                                 |
| Type annotations in `.js`                           | Lint error   | Move types to JSDoc; see [`sfcc/no-type-annotations`](rules/sfcc/no-type-annotations.md).              |
| `importScript`, `importPackage`, or `importClass`   | Lint error   | Use CommonJS `require()`; see [`sfcc/no-rhino-import-globals`](rules/sfcc/no-rhino-import-globals.md). |
| SFCC `empty(...)`                                   | Lint error   | Use an explicit type-appropriate check; see [`sfcc/no-empty-global`](rules/sfcc/no-empty-global.md).   |
| Java-style `String.equals(...)`                     | Lint error   | Use strict equality; see [`sfcc/no-string-equals`](rules/sfcc/no-string-equals.md).                    |
| `.ds` file                                          | Lint error   | Rename it to `.js`; see [`sfcc/no-ds-files`](rules/sfcc/no-ds-files.md).                               |
| `default xml namespace = "..."` or `for each (...)` | Parser error | Rewrite it before lint rules can run.                                                                  |

### Rhino `const` strategy

Use `const` wherever Rhino can handle it reliably. Three coordinated rules keep declarations modern without introducing Rhino scoping failures.

| Context                                            | Declaration | Rule                                                              |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| Function top level, never reassigned               | `const`     | [`sfcc/prefer-const`](rules/sfcc/prefer-const.md)                 |
| Loop header or declaration inside a loop body      | `let`       | [`sfcc/rhino-const-compat`](rules/sfcc/rhino-const-compat.md)     |
| Nested block with a unique name                    | `const`     | Allowed; no rule reports it.                                      |
| Nested blocks that reuse the same declaration name | `let`       | [`sfcc/rhino-const-conflict`](rules/sfcc/rhino-const-conflict.md) |

The rules are designed to run together: `sfcc/prefer-const` modernizes safe bindings, while the Rhino-specific rules protect loop and nested-block scopes. Repeated `--fix` runs therefore remain stable.

::: details See all three rules in one example

```js
function route() {
  let topLevel = 1 // sfcc/prefer-const -> const // [!code highlight]

  for (let i = 0; i < 3; i += 1) {
    const loopValue = i * 2 // sfcc/rhino-const-compat -> let // [!code warning]
    process(loopValue)
  }

  if (flagA) {
    const temp = 1 // sfcc/rhino-const-conflict -> let // [!code error]
    process(temp)
  }
  if (flagB) {
    const temp = 2 // sfcc/rhino-const-conflict -> let // [!code error]
    process(temp)
  }

  return topLevel
}
```

Rhino can treat nested `const` declarations as function-scoped. A unique nested binding is safe, but reusing the same name in another nested block can produce a redeclaration error even though modern JavaScript accepts it.

:::

### E4X and parser boundaries

`sfcc/no-e4x-syntax` runs only after ESLint has parsed the file. It can report JSX/E4X-like elements and fragments that the configured parser accepts. Static markup receives an explicit `XML(...)` conversion suggestion; dynamic markup is reported without a suggestion because preserving escaping and runtime behavior requires manual review.

Some Rhino/E4X-era constructs are rejected earlier. `default xml namespace = "..."` and `for each (value in collection)` cause fatal parser errors, so no ESLint rule can inspect them. Rewrite these constructs manually using explicit XML handling and standard loops.

## Migration Recipes

These focused replacements cover the legacy syntax most likely to prevent modern linting.

### Iterate values

```diff
- for each (item in items) {
+ for (let item of items) {
    process(item)
  }
```

### Iterate object keys and values

```diff
- for each (value in obj) {
-   process(value)
+ for (let key in obj) {
+   if (Object.prototype.hasOwnProperty.call(obj, key)) {
+     let value = obj[key]
+     process(value)
+   }
  }
```

### Replace E4X literal markup

```diff
- const payload = (
-   <request>
-     <id>{id}</id>
-   </request>
- )
+ const payload = XML(`<request><id>${id}</id></request>`)
```

`default xml namespace = "..."` is also parser-incompatible in modern JavaScript and must be refactored manually.

## Built-in Plugins

This package ships two built-in ESLint plugins, both automatically registered in the recommended config:

1. `sfcc` for general SFCC/Rhino compatibility rules
2. `sitegenesis` for the SiteGenesis-specific controller rule ported from [`eslint-plugin-sitegenesis`](https://www.npmjs.com/package/eslint-plugin-sitegenesis)

### `sfcc`

The `sfcc` plugin contains the general Rhino/SFCC runtime rules:

::: tip Recommended is not a ranking

Every rule in this plugin addresses an intentional compatibility or project-policy concern, whether or not it is enabled by the recommended config. The preset is a conservative baseline; opt-in rules are provided for conventions that depend on a team's architecture or migration goals. This distinction follows the [Commerce Klaus philosophy](/about/philosophy#treat-recommended-configs-as-a-baseline-not-a-ranking) of making platform constraints and project decisions explicit.

:::

| Rule                                                                                          | Description                                                                                                                                                                                                  | Default |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| [sfcc/no-controllers](rules/sfcc/no-controllers.md)                                           | Disallows files below `cartridge/controllers/` for Storefront Next, PWA, or selected cartridges that must remain controller-free.                                                                            | Off     |
| [sfcc/no-custom-api](rules/sfcc/no-custom-api.md)                                             | Disallows JavaScript below `cartridge/rest-apis/` in cartridges that must not expose Custom APIs.                                                                                                            | Off     |
| [sfcc/no-ds-files](rules/sfcc/no-ds-files.md)                                                 | Disallows legacy `.ds` files in SFCC projects. Use `.js` files instead.                                                                                                                                      | `error` |
| [sfcc/no-dw-api](rules/sfcc/no-dw-api.md)                                                     | Disallows SFCC `dw/*` APIs in portable domain, utility, or shared cartridges, with support for exact and namespace allow lists.                                                                              | Off     |
| [sfcc/no-e4x-syntax](rules/sfcc/no-e4x-syntax.md)                                             | Disallows JSX/E4X-like tag syntax (e.g. `<a/>`) in SFCC JavaScript to avoid parser ambiguity and unsupported runtime patterns.                                                                               | `error` |
| [sfcc/no-empty-global](rules/sfcc/no-empty-global.md)                                         | Disallows the SFCC-specific `empty(...)` global. Use explicit checks such as `.length === 0`, `Object.keys(...).length === 0`, or `.isEmpty()` instead.                                                      | `error` |
| [sfcc/no-forms](rules/sfcc/no-forms.md)                                                       | Disallows SFCC `dw/web/Form*` modules and the SFRA `server.forms` API in headless cartridges.                                                                                                                | Off     |
| [sfcc/no-hooks](rules/sfcc/no-hooks.md)                                                       | Disallows scripts registered by a cartridge's `hooks.json`, including Salesforce and project-specific hooks.                                                                                                 | Off     |
| [sfcc/no-isml-rendering](rules/sfcc/no-isml-rendering.md)                                     | Disallows ISML/template modules and SFRA response rendering in headless cartridges.                                                                                                                          | Off     |
| [sfcc/no-page-designer](rules/sfcc/no-page-designer.md)                                       | Disallows `dw/experience/*` APIs in cartridges that must remain independent of Page Designer.                                                                                                                | Off     |
| [sfcc/no-pipeline-api](rules/sfcc/no-pipeline-api.md)                                         | Disallows JavaScript access to the legacy `dw/system/Pipeline` API.                                                                                                                                          | Off     |
| [sfcc/no-platform-globals](rules/sfcc/no-platform-globals.md)                                 | Disallows stateful SFCC globals (`customer`, `request`, `response`, and `session`) in favor of explicit dependencies.                                                                                        | Off     |
| [sfcc/no-proprietary-module-syntax](rules/sfcc/no-proprietary-module-syntax.md)               | Disallows configurable SFCC-specific module syntax (`*/*`, `~/*`, and `module.superModule`) for projects that require portable modules.                                                                      | Off     |
| [sfcc/no-custom-api-additional-properties](rules/sfcc/no-custom-api-additional-properties.md) | Disallows `additionalProperties` in Custom API request body schemas, since the platform does not register such endpoints.                                                                                    | `error` |
| [sfcc/no-custom-api-response-methods](rules/sfcc/no-custom-api-response-methods.md)           | Disallows legacy global `response` APIs in Custom API implementations, which must return JSON through `RESTResponseMgr`.                                                                                     | `error` |
| [sfcc/no-string-equals](rules/sfcc/no-string-equals.md)                                       | Disallows Java-style `String.equals(...)` calls in JavaScript files. Use strict equality (`===`) instead.                                                                                                    | `error` |
| [sfcc/no-type-annotations](rules/sfcc/no-type-annotations.md)                                 | Disallows type annotation syntax in JavaScript files (e.g. `const x: string = ...`, `function y(): number {}`). Rhino/E4X may accept it, but it is invalid in standard JavaScript; use JSDoc typing instead. | `error` |
| [sfcc/no-rhino-import-globals](rules/sfcc/no-rhino-import-globals.md)                         | Disallows legacy Rhino globals `importScript(...)`, `importPackage(...)`, and `importClass(...)`. Use CommonJS `require()` instead.                                                                          | `error` |
| [sfcc/no-rhino-extensions](rules/sfcc/no-rhino-extensions.md)                                 | Disallows Rhino and LiveConnect runtime globals such as `Iterator`, `Packages`, `java`, and `javax`.                                                                                                         | Off     |
| [sfcc/no-service-framework](rules/sfcc/no-service-framework.md)                               | Disallows `dw/svc/*` APIs in cartridges that must delegate external communication to an integration layer.                                                                                                   | Off     |
| [sfcc/no-sfra-server](rules/sfcc/no-sfra-server.md)                                           | Disallows the SFRA `server` module in headless and SiteGenesis cartridges.                                                                                                                                   | Off     |
| [sfcc/prefer-native-collections](rules/sfcc/prefer-native-collections.md)                     | Prefers native `Array`, `Map`, and `Set` collections over explicit imports of concrete `dw/util` collection implementations.                                                                                 | Off     |
| [sfcc/prefer-const](rules/sfcc/prefer-const.md)                                               | Requires `const` for `let` declarations that are never reassigned, excluding Rhino-sensitive nested/loop contexts.                                                                                           | `error` |
| [sfcc/rhino-const-compat](rules/sfcc/rhino-const-compat.md)                                   | Enforces `let` instead of `const` in Rhino loop-critical contexts (loop headers and declarations inside loop bodies) and supports auto-fix.                                                                  | `error` |
| [sfcc/rhino-const-conflict](rules/sfcc/rhino-const-conflict.md)                               | Detects same-name `const` declarations in nested blocks within the same function (Rhino treats them as function-scoped) and supports auto-fix to `let`.                                                      | `error` |
| [sfcc/valid-custom-api-dir-name](rules/sfcc/valid-custom-api-dir-name.md)                     | Requires Custom API `rest-apis` directory names to contain only lowercase alphanumeric characters and hyphens.                                                                                               | `error` |
| [sfcc/valid-custom-api-export](rules/sfcc/valid-custom-api-export.md)                         | Requires a public static CommonJS export for each Custom API endpoint mapped to the file in the rest-apis `api.json`.                                                                                        | `error` |
| [sfcc/valid-hook-export](rules/sfcc/valid-hook-export.md)                                     | Requires a static CommonJS export for each Salesforce hook method registered for the file in the cartridge's `hooks.json`.                                                                                   | `error` |
| [sfcc/valid-require-path](rules/sfcc/valid-require-path.md)                                   | Validates SFCC-compatible `require()` paths (`dw/*`, `cartridgeName/*`, `./*`, `../*`, `*/*`, `~/*`) and supports optional filesystem existence checks.                                                      | `error` |

The recommended config intentionally combines these `sfcc/*` rules so `--fix` does not bounce between conflicting suggestions: Rhino-unsafe `const` becomes `let`, while genuinely safe top-level function bindings still become `const`.

### `sitegenesis`

`sitegenesis` only contains `sitegenesis/no-global-require`.

That rule is enabled in the recommended config by default, because it is still useful protection for repositories that contain SiteGenesis-style controller code. In non-SiteGenesis projects it is effectively dormant, because it only applies to files under `cartridge/controllers/`.

| Rule                                                                    | Description                                                                                                                                              | Default |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| [sitegenesis/no-global-require](rules/sitegenesis/no-global-require.md) | Disallows top-level `require()` calls in controller files when not every route function uses them. Only applies to files under `cartridge/controllers/`. | `error` |

---

## Package history and migration

This package was originally maintained and published as `@jenssimon/eslint-config-sfcc`. Version 5.0.0 of that package introduced ESLint Flat Config and the breaking changes described below. Development continued under the `@jenssimon` scope before the package moved to Commerce Klaus as `@commerce-klaus/eslint-config-sfcc`, whose release history starts at version 1.0.0.

If you use `@jenssimon/eslint-config-sfcc` version 4 or earlier, migrate both the ESLint configuration format and the package name. If you already use version 5 or later under the `@jenssimon` scope, your configuration is already based on Flat Config; update the dependency and imports to the `@commerce-klaus` package name and review the current configuration API.

### Migrating from @jenssimon/eslint-config-sfcc <= v4

This is a major release with breaking changes.

### What changed

**ESLint Flat Config**
The package now uses the [flat config format](https://eslint.org/docs/latest/use/configure/configuration-files) (`eslint.config.js`). The legacy `.eslintrc`-based format is no longer supported.

**Focus: compatibility, not formatting**
The config no longer enforces any code style or formatting rules. Its sole purpose is to detect JavaScript features that are not supported on SFCC sandboxes (Rhino engine). Formatting should be handled separately, e.g. with [Prettier](https://github.com/prettier/prettier) or [Oxfmt](https://github.com/oxc-project/oxc).

**No more base config**
The previous version extended [`@jenssimon/eslint-config-base`](https://github.com/jenssimon/eslint-config-base) (Airbnb style guide). This dependency has been removed entirely. Rules like `comma-dangle`, `no-var`, `import/*`, `consistent-return`, etc. are no longer part of this config.

**[`eslint-plugin-es5`](https://github.com/nkt/eslint-plugin-es5) → [`eslint-plugin-es`](https://github.com/mysticatea/eslint-plugin-es)**
The old `eslint-plugin-es5` has been replaced by [`eslint-plugin-es`](https://github.com/mysticatea/eslint-plugin-es). Rules have been mapped accordingly.

**No more SiteGenesis / SFRA configs**
The `sfra` and `sfra-storefront` configurations have been removed. These configurations were specific to SFRA and SiteGenesis and are not part of this general-purpose SFCC config. The external `eslint-plugin-sitegenesis` dependency is no longer used — `sitegenesis/no-global-require` is now built in, and the Rhino-specific general rules live in the built-in `sfcc` plugin.

### Migration steps

1. Replace `.eslintrc.*` with `eslint.config.js`
2. Update the package name and import (see [Usage](#recommended-config) above)
3. Remove [`@jenssimon/eslint-config-base`](https://github.com/jenssimon/eslint-config-base), [`eslint-plugin-es5`](https://github.com/nkt/eslint-plugin-es5), and [`eslint-plugin-sitegenesis`](https://www.npmjs.com/package/eslint-plugin-sitegenesis) from your dependencies — `sitegenesis/no-global-require` is built in and the general Rhino rules are now `sfcc/*`
4. Add any formatting rules you need directly to your own `eslint.config.js`

## Development

```bash
vp install
vp test
vp check
vp pack
```

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/eslint-config-sfccc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/eslint-config-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/eslint-config-sfcc
