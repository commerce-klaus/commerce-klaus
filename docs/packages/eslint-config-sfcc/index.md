[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/eslint-config-sfcc

Shareable ESLint flat config for Salesforce Commerce Cloud (SFCC) projects.

This package continues `@jenssimon/eslint-config-sfcc` under the [Commerce Klaus](https://github.com/commerce-klaus) organization.

## Modern JavaScript where SFCC supports it

This config is not an ES5 style guide. Its goal is to let SFCC projects use the most modern, idiomatic JavaScript that is known to run reliably on the platform, while catching unsupported features before deployment.

::: tip Compatibility policy

Write modern JavaScript by default. A feature is restricted only when the [SFCC script runtime](/guide/sfcc-script-runtime) does not support it reliably or when it conflicts with a platform-specific runtime contract.

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
- **String:** `String.fromCodePoint` and the `includes`, `startsWith`, `endsWith`, `repeat`, `padStart`, `padEnd`, `trimStart`, and `trimEnd` prototype methods
- **Object:** `Object.assign`, `Object.values`, `Object.entries`, and `Object.fromEntries`
- **Number:** `Number.isFinite`, `Number.isNaN`, `Number.isSafeInteger`, `Number.parseInt`, and `Number.parseFloat`
- **Globals and primitives:** `globalThis` and `BigInt`

The rule configuration and integration tests define the compatibility contract. Features outside this verified set may still be restricted when the sandbox cannot execute them reliably.

:::

## Choose the linting workflow

::: tip Prefer Oxlint for everyday work

Use **Oxlint as the default local and CI lint pass**. It starts quickly, covers the normal Commerce Klaus compatibility and architecture rules, and is the better feedback loop for day-to-day development.

Use **ESLint deliberately for complete migrations and audits**. Its parser can inspect legacy files and nonstandard syntax that Oxlint rejects or does not discover, and its TypeScript parser services provide higher-confidence analysis for complex inferred types.

:::

| Workflow                                       | Recommended tool        | Why                                                                                                  |
| ---------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Normal development, editor feedback, and CI    | Oxlint                  | Fast feedback with almost the complete Commerce Klaus rule set                                       |
| Initial modernization or legacy syntax cleanup | ESLint                  | Covers `.ds`, E4X-like syntax, JavaScript type annotations, and complex type-aware migration cases   |
| Ongoing project with legacy-regression guards  | Oxlint, then ESLint     | Keeps the daily pass fast while a focused ESLint fallback covers the three parser-boundary rules     |
| Maximum-confidence `empty()` migration         | ESLint migration preset | Uses TypeScript parser services for inferred and aliased types that Oxlint JavaScript plugins cannot |

Start with the [Oxlint configuration](#use-oxlint-for-daily-linting). Add the [focused ESLint fallback](#eslint-after-oxlint) when the repository must prevent legacy parser-boundary syntax from returning.

## Oxlint rule coverage

The Oxlint preset enables every built-in Commerce Klaus rule that Oxlint can parse and discover. The exceptions and type-aware differences are explicit below.

### Rules unavailable in Oxlint

These are parser and file-discovery boundaries, not rules omitted for performance:

| ESLint-only rule                                                | Why Oxlint cannot run it                                                                                                               | When the rule matters                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`sfcc/no-ds-files`](rules/sfcc/no-ds-files.md)                 | Oxlint ignores `.ds` files, so the JavaScript plugin never receives the file and cannot report its extension.                          | Modernizing cartridges that may still contain legacy Demandware Script files                |
| [`sfcc/no-e4x-syntax`](rules/sfcc/no-e4x-syntax.md)             | E4X-like elements are not standard JavaScript. Oxlint stops with a parser error before the Commerce Klaus rule can inspect the nodes.  | Finding E4X-like markup and offering the safe static `XML(...)` migration suggestion        |
| [`sfcc/no-type-annotations`](rules/sfcc/no-type-annotations.md) | TypeScript-style annotations inside `.js` are invalid JavaScript, so Oxlint stops before the JavaScript plugin can report or fix them. | Moving tolerated legacy annotations to JSDoc while preserving runnable cartridge JavaScript |

The focused [ESLint-after-Oxlint config](#eslint-after-oxlint) covers exactly these rules without duplicating Oxlint diagnostics.

### Rules refined by ESLint type information

These rules run in both tools. Oxlint uses syntax, literals, constant initializers, directly recognizable SFCC values, and rule-specific local JSDoc where supported. ESLint can additionally use TypeScript parser services to follow inferred types and aliases.

| Rule                                                                            | Oxlint behavior                                                                                      | Additional ESLint precision                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`sfcc/no-ambiguous-empty`](rules/sfcc/no-ambiguous-empty.md)                   | Uses locally visible evidence and reports values whose `empty()` semantics remain unknown or mixed.  | Resolves inferred and aliased argument types before deciding whether an `empty()` call is ambiguous.       |
| [`sfcc/no-empty-global`](rules/sfcc/no-empty-global.md)                         | Always reports `empty()`; offers a replacement only when the argument semantics are locally known.   | Offers behavior-preserving suggestions for additional arguments whose inferred or aliased type is known.   |
| [`sfcc/no-string-equals`](rules/sfcc/no-string-equals.md)                       | Conservatively reports every matching `.equals(...)` call.                                           | Restricts reports to string-like receivers and skips known non-string or mixed receiver types.             |
| [`sfcc/prefer-explicit-empty-check`](rules/sfcc/prefer-explicit-empty-check.md) | Suggests or fixes replacements when local evidence identifies the `empty()` argument semantics.      | Recognizes additional inferred and aliased argument types, producing more migration diagnostics and fixes. |
| [`sfcc/valid-require-path`](rules/sfcc/valid-require-path.md)                   | Validates static string and template-literal module paths; ignores non-literal identifier arguments. | Also validates identifiers with exact string-literal types and unions containing only string literals.     |

::: info No rule requires parser services to run

The five rules above degrade conservatively when TypeScript parser services are absent. They remain available in Oxlint; they are not part of the ESLint-only fallback. Use ESLint when a migration needs the most complete analysis of inferred and aliased types.

:::

## ESLint configuration

### Install

::: code-group

```bash [pnpm]
pnpm add -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [npm]
npm install -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [Yarn]
yarn add -D eslint @commerce-klaus/eslint-config-sfcc
```

```bash [Vite+]
vp install -D eslint @commerce-klaus/eslint-config-sfcc
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
The config disables Node.js and browser globals inherited from earlier flat config entries, then enables only the CommonJS and SFCC runtime globals available to server-side cartridge code.
The Unicorn rule that discourages asterisk prefixes in documentation comments is disabled so standard JSDoc annotations remain usable for SFCC type information.

### Older compatibility modes

The recommended config follows the current SFCC Script API. Add a compatibility preset after `recommended` when a code version targets an older compatibility mode:

```js [eslint.config.js]
import sfcc from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"

export default defineConfig(sfcc.configs.recommended, sfcc.configs["compatibility-21.2"])
```

| Preset               | Additional restrictions                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compatibility-21.2` | Disallows BigInt, `globalThis`, and `Object.entries`, `Object.values`, and `Object.fromEntries`; disables conflicting Unicorn replacement suggestions |
| `compatibility-22.7` | Currently none; establishes an explicit 22.7 contract for future Script API additions                                                                 |

Use `createCompatibilityConfig()` to apply an older mode to a custom cartridges directory or explicit file globs:

```js [eslint.config.js]
import { createCompatibilityConfig } from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  sfcc.configs.recommended,
  createCompatibilityConfig("21.2", { cartridgesDir: "commerce/cartridges" }),
)
```

Compatibility presets are additive restrictions. They do not replace `recommended` and must be composed after it.

## Built-in Plugins

This package ships two built-in ESLint plugins, both automatically registered in the recommended config:

1. `sfcc` for general SFCC script runtime compatibility rules
2. `sitegenesis` for the SiteGenesis-specific controller rule ported from [`eslint-plugin-sitegenesis`](https://www.npmjs.com/package/eslint-plugin-sitegenesis)

### `sfcc`

The `sfcc` plugin contains the general SFCC script runtime rules:

::: tip Recommended is not a ranking

Every rule in this plugin addresses an intentional compatibility or project-policy concern, whether or not it is enabled by the recommended config. The preset is a conservative baseline; opt-in rules are provided for conventions that depend on a team's architecture or migration goals. This distinction follows the [Commerce Klaus philosophy](/about/philosophy#treat-recommended-configs-as-a-baseline-not-a-ranking) of making platform constraints and project decisions explicit.

:::

**Default indicators:** 🔴 `error` · 🟡 `warn` · ⚪ `off` · 🛠️ auto-fix available · ➖ no auto-fix

Oxlint runs every built-in rule except `sfcc/no-ds-files`, `sfcc/no-e4x-syntax`, and `sfcc/no-type-annotations`. See [why those rules require ESLint](#rules-that-require-eslint).

| Rule                                                                                          | Description                                                                                                                                                                                                  | Default    | Auto-fix  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------- |
| [sfcc/no-ambiguous-empty](rules/sfcc/no-ambiguous-empty.md)                                   | Requires enough type information to determine which SFCC `empty()` semantics apply before migration.                                                                                                         | 🟡 `warn`  | ➖ No     |
| [sfcc/no-controllers](rules/sfcc/no-controllers.md)                                           | Disallows files below `cartridge/controllers/` for Storefront Next, PWA, or selected cartridges that must remain controller-free.                                                                            | ⚪ `off`   | ➖ No     |
| [sfcc/no-custom-api-additional-properties](rules/sfcc/no-custom-api-additional-properties.md) | Disallows `additionalProperties` in Custom API request body schemas, since the platform does not register such endpoints.                                                                                    | 🔴 `error` | ➖ No     |
| [sfcc/no-custom-api-response-methods](rules/sfcc/no-custom-api-response-methods.md)           | Disallows legacy global `response` APIs in Custom API implementations, which must return JSON through `RESTResponseMgr`.                                                                                     | 🔴 `error` | ➖ No     |
| [sfcc/no-custom-api](rules/sfcc/no-custom-api.md)                                             | Disallows JavaScript below `cartridge/rest-apis/` in cartridges that must not expose Custom APIs.                                                                                                            | ⚪ `off`   | ➖ No     |
| [sfcc/no-ds-files](rules/sfcc/no-ds-files.md)                                                 | Disallows legacy `.ds` files in SFCC projects. Use `.js` files instead.                                                                                                                                      | 🔴 `error` | ➖ No     |
| [sfcc/no-dw-api](rules/sfcc/no-dw-api.md)                                                     | Disallows SFCC `dw/*` APIs in portable domain, utility, or shared cartridges, with support for exact and namespace allow lists.                                                                              | ⚪ `off`   | ➖ No     |
| [sfcc/no-e4x-syntax](rules/sfcc/no-e4x-syntax.md)                                             | Disallows JSX/E4X-like tag syntax (e.g. `<a/>`) in SFCC JavaScript to avoid parser ambiguity and unsupported runtime patterns.                                                                               | 🔴 `error` | ➖ No     |
| [sfcc/no-empty-global](rules/sfcc/no-empty-global.md)                                         | Strictly disallows every use of the SFCC-specific `empty(...)` global.                                                                                                                                       | ⚪ `off`   | ➖ No     |
| [sfcc/no-forms](rules/sfcc/no-forms.md)                                                       | Disallows SFCC `dw/web/Form*` modules and the SFRA `server.forms` API in headless cartridges.                                                                                                                | ⚪ `off`   | ➖ No     |
| [sfcc/no-hooks](rules/sfcc/no-hooks.md)                                                       | Disallows scripts registered by a cartridge's `hooks.json`, including Salesforce and project-specific hooks.                                                                                                 | ⚪ `off`   | ➖ No     |
| [sfcc/no-isml-rendering](rules/sfcc/no-isml-rendering.md)                                     | Backward-compatible umbrella that disallows both template modules and SFRA response rendering.                                                                                                               | ⚪ `off`   | ➖ No     |
| [sfcc/no-page-designer](rules/sfcc/no-page-designer.md)                                       | Disallows `dw/experience/*` APIs in cartridges that must remain independent of Page Designer.                                                                                                                | ⚪ `off`   | ➖ No     |
| [sfcc/no-pipeline-api](rules/sfcc/no-pipeline-api.md)                                         | Disallows JavaScript access to the legacy `dw/system/Pipeline` API.                                                                                                                                          | ⚪ `off`   | ➖ No     |
| [sfcc/no-platform-globals](rules/sfcc/no-platform-globals.md)                                 | Disallows stateful SFCC globals (`customer`, `request`, `response`, and `session`) in favor of explicit dependencies.                                                                                        | ⚪ `off`   | ➖ No     |
| [sfcc/no-proprietary-module-syntax](rules/sfcc/no-proprietary-module-syntax.md)               | Disallows configurable SFCC-specific module syntax (`*/*`, `~/*`, and `module.superModule`) for projects that require portable modules.                                                                      | ⚪ `off`   | ➖ No     |
| [sfcc/no-rhino-extensions](rules/sfcc/no-rhino-extensions.md)                                 | Disallows Rhino and LiveConnect runtime globals such as `Iterator`, `Packages`, `java`, and `javax`.                                                                                                         | ⚪ `off`   | ➖ No     |
| [sfcc/no-rhino-import-globals](rules/sfcc/no-rhino-import-globals.md)                         | Disallows legacy Rhino globals `importScript(...)`, `importPackage(...)`, and `importClass(...)`. Use CommonJS `require()` instead.                                                                          | 🔴 `error` | ➖ No     |
| [sfcc/no-service-framework](rules/sfcc/no-service-framework.md)                               | Disallows `dw/svc/*` APIs in cartridges that must delegate external communication to an integration layer.                                                                                                   | ⚪ `off`   | ➖ No     |
| [sfcc/no-sfra-server](rules/sfcc/no-sfra-server.md)                                           | Disallows the SFRA `server` module in headless and SiteGenesis cartridges.                                                                                                                                   | ⚪ `off`   | ➖ No     |
| [sfcc/no-storefront-isml-rendering](rules/sfcc/no-storefront-isml-rendering.md)               | Disallows SFRA storefront response rendering while permitting non-storefront templates such as email and XML.                                                                                                | ⚪ `off`   | ➖ No     |
| [sfcc/no-string-equals](rules/sfcc/no-string-equals.md)                                       | Disallows Java-style `String.equals(...)` calls in JavaScript files. Use strict equality (`===`) instead.                                                                                                    | 🔴 `error` | ➖ No     |
| [sfcc/no-string-raw](rules/sfcc/no-string-raw.md)                                             | Disallows `String.raw` because affected SFCC Rhino versions can expose its result as an internal `ConsString` to Java-backed platform APIs.                                                                  | 🔴 `error` | 🛠️ Yes    |
| [sfcc/no-template-rendering](rules/sfcc/no-template-rendering.md)                             | Disallows access to `dw/template/ISML` and `dw/util/Template` where all server-side template rendering is prohibited.                                                                                        | ⚪ `off`   | ➖ No     |
| [sfcc/no-type-annotations](rules/sfcc/no-type-annotations.md)                                 | Disallows type annotation syntax in JavaScript files (e.g. `const x: string = ...`, `function y(): number {}`). Rhino/E4X may accept it, but it is invalid in standard JavaScript; use JSDoc typing instead. | 🔴 `error` | 🛠️ Yes    |
| [sfcc/prefer-const](rules/sfcc/prefer-const.md)                                               | Requires `const` for `let` declarations that are never reassigned, excluding Rhino-sensitive nested/loop contexts.                                                                                           | 🔴 `error` | 🛠️ Yes    |
| [sfcc/prefer-explicit-empty-check](rules/sfcc/prefer-explicit-empty-check.md)                 | Suggests a behavior-preserving explicit JavaScript replacement when the `empty(...)` argument type is known.                                                                                                 | 🟡 `warn`  | 🛠️ Opt-in |
| [sfcc/prefer-generated-custom-api-types](rules/sfcc/prefer-generated-custom-api-types.md)     | Requires Custom API handlers, parsed request bodies, and response values to use operation types generated from `api.json` and OAS schemas.                                                                   | ⚪ `off`   | ➖ No     |
| [sfcc/prefer-generated-hook-types](rules/sfcc/prefer-generated-hook-types.md)                 | Requires registered Salesforce system hook exports to use their generated `SfccHooks` function type.                                                                                                         | ⚪ `off`   | ➖ No     |
| [sfcc/prefer-generated-job-step-types](rules/sfcc/prefer-generated-job-step-types.md)         | Requires effective custom job step exports to use function types generated from `steptypes.json`.                                                                                                            | ⚪ `off`   | ➖ No     |
| [sfcc/prefer-native-collections](rules/sfcc/prefer-native-collections.md)                     | Prefers native `Array`, `Map`, and `Set` collections over explicit imports of concrete `dw/util` collection implementations.                                                                                 | ⚪ `off`   | ➖ No     |
| [sfcc/prefer-tilde-require-path](rules/sfcc/prefer-tilde-require-path.md)                     | Prefers `~/` require paths for modules that belong to the importing file's own cartridge.                                                                                                                    | ⚪ `off`   | 🛠️ Yes    |
| [sfcc/require-file-extension](rules/sfcc/require-file-extension.md)                           | Requires explicit `.js`, `.ds`, or `.json` extensions in relative and cartridge module paths, with cartridge-aware auto-fixes when resolvable.                                                               | ⚪ `off`   | 🛠️ Yes    |
| [sfcc/rhino-const-compat](rules/sfcc/rhino-const-compat.md)                                   | Enforces `let` instead of `const` in Rhino loop-critical contexts (loop headers and declarations inside loop bodies) and supports auto-fix.                                                                  | 🔴 `error` | 🛠️ Yes    |
| [sfcc/rhino-const-conflict](rules/sfcc/rhino-const-conflict.md)                               | Detects same-name `const` declarations in nested blocks within the same function (Rhino treats them as function-scoped) and supports auto-fix to `let`.                                                      | 🔴 `error` | 🛠️ Yes    |
| [sfcc/valid-custom-api-dir-name](rules/sfcc/valid-custom-api-dir-name.md)                     | Requires Custom API `rest-apis` directory names to contain only lowercase alphanumeric characters and hyphens.                                                                                               | 🔴 `error` | ➖ No     |
| [sfcc/valid-custom-api-export](rules/sfcc/valid-custom-api-export.md)                         | Requires a public static CommonJS export for each Custom API endpoint mapped to the file in the rest-apis `api.json`.                                                                                        | 🔴 `error` | ➖ No     |
| [sfcc/valid-hook-export](rules/sfcc/valid-hook-export.md)                                     | Requires a static CommonJS export for each Salesforce hook method registered for the file in the cartridge's `hooks.json`.                                                                                   | 🔴 `error` | ➖ No     |
| [sfcc/valid-job-step-export](rules/sfcc/valid-job-step-export.md)                             | Requires static CommonJS exports for the functions configured for the file in effective `steptypes.json` job step definitions.                                                                               | 🔴 `error` | ➖ No     |
| [sfcc/valid-require-path](rules/sfcc/valid-require-path.md)                                   | Validates SFCC-compatible `require()` paths (`dw/*`, `cartridgeName/*`, `./*`, `../*`, `*/*`, `~/*`) and supports optional filesystem existence checks.                                                      | 🔴 `error` | ➖ No     |
| [sfcc/valid-step-type-definition](rules/sfcc/valid-step-type-definition.md)                   | Reports invalid job step definitions directly in cartridge `steptypes.json` files.                                                                                                                           | 🔴 `error` | ➖ No     |

The recommended config intentionally combines these `sfcc/*` rules so `--fix` does not bounce between conflicting suggestions: Rhino-unsafe `const` becomes `let`, while genuinely safe top-level function bindings still become `const`.

### `sitegenesis`

`sitegenesis` only contains `sitegenesis/no-global-require`.

That rule is enabled in the recommended config by default, because it is still useful protection for repositories that contain SiteGenesis-style controller code. In non-SiteGenesis projects it is effectively dormant, because it only applies to files under `cartridge/controllers/`.

| Rule                                                                    | Description                                                                                                                                                 | Default    | Auto-fix |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| [sitegenesis/no-global-require](rules/sitegenesis/no-global-require.md) | Disallows top-level `require()` calls in controller files when not every exported SiteGenesis route uses them. Only applies below `cartridge/controllers/`. | 🔴 `error` | ➖ No    |

---

## Migrate `empty()` in batches

The ESLint-only `empty-migration` preset turns the recommended `empty()` guidance into a reviewable project migration. Use a separate migration config for an established codebase so the normal lint pass can remain green while the inventory is reduced. The preset:

- reports every safely replaceable global `empty()` call as an error;
- enables automatic fixes only when the replacement preserves evaluation behavior;
- reports unknown or mixed argument types with concrete decision guidance;
- leaves ambiguous and side-effect-sensitive calls unchanged.

For the most complete inventory, install the optional TypeScript parser. Its project service follows inferred and aliased JavaScript types that Oxlint and local JSDoc analysis cannot resolve:

::: code-group

```bash [pnpm]
pnpm add -D @typescript-eslint/parser
```

```bash [npm]
npm install -D @typescript-eslint/parser
```

```bash [Yarn]
yarn add -D @typescript-eslint/parser
```

```bash [Vite+]
vp install -D @typescript-eslint/parser
```

:::

Create an opt-in migration config rather than adding the preset to the normal project config:

```js [eslint.empty-migration.config.js]
import {
  createEmptyMigrationConfig,
  createRecommendedConfig,
} from "@commerce-klaus/eslint-config-sfcc"
import parser from "@typescript-eslint/parser"
import { defineConfig } from "eslint/config"

const files = ["cartridges/**/*.js"]
const ignores = ["cartridges/*/cartridge/client/**", "cartridges/*/cartridge/static/**"]

export default defineConfig(
  {
    files,
    ignores,
    languageOptions: {
      parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  createRecommendedConfig({ files, ignores }),
  createEmptyMigrationConfig({ files, ignores }),
)
```

Run ESLint without `--fix` to inventory safe and ambiguous calls:

::: code-group

```bash [pnpm]
pnpm exec eslint --config eslint.empty-migration.config.js cartridges
```

```bash [npm]
npm exec -- eslint --config eslint.empty-migration.config.js cartridges
```

```bash [Yarn]
yarn exec eslint --config eslint.empty-migration.config.js cartridges
```

```bash [Vite+]
vp exec eslint --config eslint.empty-migration.config.js cartridges
```

:::

Use the migration formatter for an action-oriented summary instead of the normal diagnostic list:

::: code-group

```bash [pnpm]
empty_formatter=$(node -p "require.resolve('@commerce-klaus/eslint-config-sfcc/formatters/empty-migration')")
pnpm exec eslint --config eslint.empty-migration.config.js cartridges --format "$empty_formatter"
```

```bash [npm]
empty_formatter=$(node -p "require.resolve('@commerce-klaus/eslint-config-sfcc/formatters/empty-migration')")
npm exec -- eslint --config eslint.empty-migration.config.js cartridges --format "$empty_formatter"
```

```bash [Yarn]
empty_formatter=$(node -p "require.resolve('@commerce-klaus/eslint-config-sfcc/formatters/empty-migration')")
yarn exec eslint --config eslint.empty-migration.config.js cartridges --format "$empty_formatter"
```

```bash [Vite+]
empty_formatter=$(node -p "require.resolve('@commerce-klaus/eslint-config-sfcc/formatters/empty-migration')")
vp exec eslint --config eslint.empty-migration.config.js cartridges --format "$empty_formatter"
```

:::

ESLint requires a formatter file path, so `require.resolve()` turns the public package subpath into that path. The formatter counts unique source locations, groups `AUTOFIX`, `REVIEW`, and `AMBIGUOUS` calls by file, and lists all unrelated ESLint diagnostics separately. It does not change ESLint's exit code or hide parser and project errors.

Preview all safe replacements as structured output without modifying files:

::: code-group

```bash [pnpm]
pnpm exec eslint --config eslint.empty-migration.config.js cartridges --fix-dry-run --format json
```

```bash [npm]
npm exec -- eslint --config eslint.empty-migration.config.js cartridges --fix-dry-run --format json
```

```bash [Yarn]
yarn exec eslint --config eslint.empty-migration.config.js cartridges --fix-dry-run --format json
```

```bash [Vite+]
vp exec eslint --config eslint.empty-migration.config.js cartridges --fix-dry-run --format json
```

:::

Apply the safe replacements after reviewing the preview:

::: code-group

```bash [pnpm]
pnpm exec eslint --config eslint.empty-migration.config.js cartridges --fix
```

```bash [npm]
npm exec -- eslint --config eslint.empty-migration.config.js cartridges --fix
```

```bash [Yarn]
yarn exec eslint --config eslint.empty-migration.config.js cartridges --fix
```

```bash [Vite+]
vp exec eslint --config eslint.empty-migration.config.js cartridges --fix
```

:::

Treat the results as three migration queues:

| Queue                 | Meaning                                                                                                  | Action                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Autofixable           | The type and replacement are known, and the original expression is still evaluated safely.               | Review the dry-run output, then apply `--fix`.                           |
| Typed suggestion only | The replacement is known, but expanding it may repeat a getter, method call, or other member expression. | Cache the value first, then apply the explicit check manually.           |
| Ambiguous             | The type is unknown, too broad, or combines values with different SFCC `empty()` semantics.              | Inspect metadata and callers, then document or narrow the real contract. |

Diagnostic totals are not necessarily unique `empty()` call totals. One source expression can contribute more than one diagnostic while overlapping type evidence or multiple arguments are being reported. Track progress by rule and confirm the remaining source calls separately.

Known strings and arrays become length checks, SFCC collections use `isEmpty()`, and nullable objects use explicit nullish checks. A replacement is not applied automatically when it would repeat or discard a potentially side-effecting expression. The normal editor suggestion remains available for manual review.

Cache stateful expressions before expanding them:

```js [Before]
if (empty(customer.custom.loyaltyID)) {
  return
}
```

```js [After]
const loyaltyID = customer.custom.loyaltyID
if (loyaltyID === null || loyaltyID === undefined || loyaltyID.length === 0) {
  return
}
```

For an ambiguous value, decide which contract actually applies:

- `value === null || value === undefined` for nullable objects and values where only absence matters;
- `value.length === 0` with the necessary nullish checks for strings and arrays;
- `value.isEmpty()` with the necessary nullish checks for SFCC collections.

Do not replace `empty(value)` with `!value`: SFCC does not consider `0` or `false` empty. The migration rules automatically use configured site metadata for static Site preference names and `.custom` attributes with an unambiguous parser-provided receiver type. Check metadata manually for dynamic names and unknown receivers, then inspect generated Job Step and Custom API contracts and every caller of broad utility functions before deciding that a value is ambiguous. Narrow a generic helper's JSDoc contract when its callers prove a smaller set of supported values.

::: warning Native and adapter collections

Use `isEmpty()` for native `dw.util.Collection` values. Test doubles for native collections should implement that method, preferably through the Commerce Klaus test runtime. If production code intentionally also accepts an adapter collection with an `empty` property or another shape, document that separate contract and handle it explicitly instead of treating the adapter as a native SFCC collection.

:::

Add or narrow the JSDoc type after making that decision, then rerun the migration. Focused tests should cover `null`, `undefined`, empty and non-empty values, plus valid `0` and `false` values wherever those primitives are accepted.

Once no global calls remain, delete the temporary migration config and enable the strict rule after the recommended config:

```js [eslint.config.js]
import sfcc from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"

export default defineConfig(sfcc.configs.recommended, {
  rules: {
    "sfcc/no-ambiguous-empty": "off",
    "sfcc/prefer-explicit-empty-check": "off",
    "sfcc/no-empty-global": "error",
  },
})
```

Use `createEmptyMigrationConfig()` instead of the static preset to customize `cartridgesDir`, `files`, `ignores`, or shared SFCC settings.

### Use the migration with Oxlint

Oxlint can apply the same safe fixes through the JavaScript plugin. Add the generated migration override in `oxlint.config.ts`:

```ts{2,8} [oxlint.config.ts]
import { defineConfig } from "oxlint"
import sfccOxlint, {
  createOxlintEmptyMigrationOverride,
} from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"

export default defineConfig({
  ...sfccOxlint.lint,
  overrides: [createOxlintEmptyMigrationOverride()],
})
```

The builder uses the same rules, central cartridges directory, file globs, and client/static exclusions as the ESLint migration preset. Pass `cartridgesDir`, `files`, `ignores`, or shared SFCC settings to override them for one Oxlint configuration.

Run Oxlint without `--fix` to inventory known and ambiguous calls:

::: code-group

```bash [pnpm]
pnpm exec oxlint --type-aware
```

```bash [npm]
npm exec -- oxlint --type-aware
```

```bash [Yarn]
yarn exec oxlint --type-aware
```

```bash [Vite+]
vp exec oxlint --type-aware
```

:::

Apply the safe replacements with the project's normal Oxlint fix command:

::: code-group

```bash [pnpm]
pnpm exec oxlint --type-aware --fix
```

```bash [npm]
npm exec -- oxlint --type-aware --fix
```

```bash [Yarn]
yarn exec oxlint --type-aware --fix
```

```bash [Vite+]
vp exec oxlint --type-aware --fix
```

:::

Oxlint JavaScript plugins do not receive TypeScript parser services, even when Oxlint itself runs with `--type-aware`. Commerce Klaus can still classify literals, constant string initializers, local `@type` and `@param` JSDoc annotations, and directly recognizable SFCC collections. Complex inferred types and aliases require ESLint with `@typescript-eslint/parser`.

For a large initial migration, use the ESLint preset to benefit from full project type information, then keep the two Oxlint rules enabled to prevent regressions and fix locally evident cases.

## SFCC module resolution

<!--@include: ../../_partials/sfcc-module-resolution.md-->

<!--@include: ../../_partials/sfcc-module-resolution-guide-link.md-->

<!--@include: ../../_partials/project-configuration.md-->

The recommended config enables [`sfcc/valid-require-path`](rules/sfcc/valid-require-path.md). By default, the rule validates whether static `require()` and `import()` identifiers use a supported SFCC form. Enable `checkCartridgeExists` through `createRecommendedConfig()` to also resolve `*/`, `~/`, and named cartridge references against the project filesystem and report missing modules.

ESLint validates source code; it does not transform or execute cartridge modules. `dw/*` imports are accepted as platform boundaries rather than looked up on disk. `module.superModule` is recognized as SFCC syntax, while the opt-in [`sfcc/no-proprietary-module-syntax`](rules/sfcc/no-proprietary-module-syntax.md) rule can prohibit it together with `*/` and `~/` when a project requires portable CommonJS modules.

The [shared SFCC settings](#customize-with-shared-sfcc-settings) define the cartridges directory, cartridge order, site metadata, and additional bare modules used for filesystem validation.

### Generated types preset

Projects that run `sfcc-ts-sync-types` can enforce generated types at metadata boundaries with the opt-in `generated-types` preset:

```js{6} [eslint.config.js]
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  sfcc.configs.recommended,
  sfcc.configs["generated-types"],
)
```

The preset verifies metadata-driven function boundaries and enables:

| Rule                                | Generated contract                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `prefer-generated-job-step-types`   | `SfccJobSteps.Definitions` from `steptypes.json`                                 |
| `prefer-generated-hook-types`       | `SfccHooks` aliases for registered Salesforce system hooks                       |
| `prefer-generated-custom-api-types` | Custom API `Handler`, parsed `RequestBody`, and local `Response` values from OAS |

Missing or broader `@type` annotations receive an editor suggestion that inserts or replaces the generated type. All three rules follow the exported local binding, so both `const handler = function () {}` and `function handler() {}` declarations are supported. The Custom API rule follows local `JSON.parse()` results derived from `request.httpParameterMap.requestBodyAsString` and applies the operation `RequestBody` type. It also follows a local identifier passed to `RESTResponseMgr.createSuccess()` within that handler and applies the generated operation `Response` type.

Generated custom attribute declarations are not enforced by this preset. Access through typed platform APIs such as `Product.custom` and `CustomObjectMgr.getCustomObject()` is already inferred automatically. A standalone helper parameter named `custom` does not contain enough information to determine its system or custom object type without guessing.

Use `createGeneratedTypesConfig()` when the metadata resolver needs an explicit cartridge path or a non-default cartridges directory:

```js [eslint.config.js]
import sfcc, { createGeneratedTypesConfig } from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"

export default defineConfig(
  sfcc.configs.recommended,
  createGeneratedTypesConfig({
    cartridgesDir: "commerce/cartridges",
    sfcc: { cartridgePath: ["app_custom", "app_base"] },
  }),
)
```

### Storefront architecture presets

Storefront presets are policy overlays for the shared cartridge architecture
labels:

<!--@include: ../../_partials/cartridge-architectures.md-->

Compose one preset after `recommended` when the same architecture applies to
every cartridge covered by the ESLint configuration:

The presets do not change the JavaScript compatibility baseline: modern syntax and standard library APIs supported by SFCC remain allowed in every storefront preset.
`sitegenesis/no-global-require` also remains enabled in every preset because the rule limits itself to files under `cartridge/controllers/`.

```js{5-6} [eslint.config.js]
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  sfcc.configs.recommended,
  sfcc.configs["storefront-next"],
)
```

<!--@include: ../../_partials/cartridge-architecture-eslint-policies.md-->

The [Cartridge architectures guide](/guide/cartridge-architectures) explains
the intended boundary, special cases, and selection behavior for every label.

#### Configure mixed architectures centrally

Assign each cartridge to an architecture in the shared project configuration:

```js [commerce-klaus.config.js]
import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgesDir: "cartridges",
  architectures: {
    "storefront-next": ["app_headless", "bc_custom_api"],
    sfra: ["app_storefront_base", "modules"],
    "sitegenesis-controllers": ["bm_tools"],
  },
})
```

Then compose the generated cartridge-scoped overlays after the recommended config:

```js{2,6} [eslint.config.js]
import sfcc, { createCartridgeArchitectureConfig } from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"

export default defineConfig(
  sfcc.configs.recommended,
  createCartridgeArchitectureConfig(),
)
```

The builder discovers `commerce-klaus.config.ts` or `.js`, respects its `cartridgesDir`, and rejects unknown architectures or cartridges assigned to more than one architecture. Explicit `architectures`, `cartridgesDir`, `cwd`, and `configFile` options remain available for isolated tooling.

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

The recommended config deliberately disables selected rules from commonly used ESLint presets when they suggest syntax, APIs, or module patterns that the SFCC script runtime does not support. This allows you to combine the SFCC config with those presets without forcing otherwise valid server-side SFCC code into incompatible modern JavaScript patterns.

The compatibility overrides cover:

- **ESLint recommended and core rules:** disables rules such as `object-shorthand`, `prefer-object-spread`, `prefer-rest-params`, and `prefer-spread` that can suggest unsupported syntax or APIs. The core `prefer-const` rule is replaced by SFCC-aware rules that account for Rhino's scoping behavior.
- **`eslint-plugin-unicorn`:** disables modern syntax and API preferences such as `prefer-at`, `prefer-module`, `prefer-spread`, and `prefer-string-replace-all`, as well as rules whose fixes or assumptions are unsafe for the SFCC script runtime.
- **`typescript-eslint`:** disables `@typescript-eslint/no-require-imports` because SFCC server-side modules use CommonJS `require()`.
- **`eslint-plugin-sonarjs`:** disables `sonarjs/no-implicit-global` because its assumptions conflict with SFCC's server-side module environment.

These overrides only take effect for rules enabled by another config in your ESLint setup; this package does not otherwise enable the external presets.

### Use Oxlint for daily linting

Oxlint is the recommended default for normal development. It can run the included `sfcc` and `sitegenesis` plugins through its alpha JavaScript plugin API.

Install Oxlint alongside the Commerce Klaus config:

::: code-group

```bash [pnpm]
pnpm add -D oxlint @commerce-klaus/eslint-config-sfcc
```

```bash [npm]
npm install -D oxlint @commerce-klaus/eslint-config-sfcc
```

```bash [Yarn]
yarn add -D oxlint @commerce-klaus/eslint-config-sfcc
```

```bash [Vite+]
vp install -D oxlint @commerce-klaus/eslint-config-sfcc
```

:::

Create an `oxlint.config.mjs` file that exports the included preset:

```js{1,3} [oxlint.config.mjs]
import sfcc from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"

export default sfcc
```

The preset loads both plugins and enables the supported SFCC and SiteGenesis rules.

See the central [Oxlint rule coverage](#oxlint-rule-coverage) matrix for the three ESLint-only rules and the five rules that gain additional precision from ESLint type information.

For mixed architectures, reuse the assignments from the central project configuration:

```js{1,6} [oxlint.config.mjs]
import sfcc, {
  createOxlintArchitectureOverrides,
} from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"

export default {
  lint: {
    ...sfcc.lint,
    overrides: createOxlintArchitectureOverrides(),
  },
}
```

The generated overrides use the same exported `cartridgeArchitectureRules` records as ESLint. When the project already has Oxlint overrides, compose both arrays:

```js
overrides: [
  ...createOxlintArchitectureOverrides(),
  {
    files: ["cartridges/modules/server/**"],
    rules: { "sfcc/no-forms": "off" },
  },
]
```

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

::: info Type-aware refinement

Oxlint JavaScript plugins do not provide TypeScript parser services, even when Oxlint runs with `--type-aware`. Type-sensitive Commerce Klaus rules continue with their documented conservative behavior instead of silently disabling themselves.

This distinction is why Oxlint is preferred for everyday feedback while ESLint remains the higher-confidence migration tool.

:::

### ESLint after Oxlint

Run ESLint after Oxlint for a complete migration or to keep legacy syntax from returning. The fallback covers only `sfcc/no-ds-files`, `sfcc/no-e4x-syntax`, and `sfcc/no-type-annotations`.

This optional fallback requires `@typescript-eslint/parser`:

::: code-group

```bash [pnpm]
pnpm add -D @typescript-eslint/parser
```

```bash [npm]
npm install -D @typescript-eslint/parser
```

```bash [Yarn]
yarn add -D @typescript-eslint/parser
```

```bash [Vite+]
vp install -D @typescript-eslint/parser
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

| Pattern                                             | Result       | Recommended action                                                                                                                                      |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `XML` and `XMLList` identifiers                     | Allowed      | Constructor-style references remain available.                                                                                                          |
| Static JSX/E4X-like markup                          | Lint error   | Convert it to `XML(\`...\`)`; see [`sfcc/no-e4x-syntax`](rules/sfcc/no-e4x-syntax.md).                                                                  |
| Dynamic JSX/E4X-like markup                         | Lint error   | Refactor manually; no automatic conversion is offered.                                                                                                  |
| Type annotations in `.js`                           | Lint error   | Move types to JSDoc; see [`sfcc/no-type-annotations`](rules/sfcc/no-type-annotations.md).                                                               |
| `importScript`, `importPackage`, or `importClass`   | Lint error   | Use CommonJS `require()`; see [`sfcc/no-rhino-import-globals`](rules/sfcc/no-rhino-import-globals.md).                                                  |
| SFCC `empty(...)`                                   | Lint warning | Apply a behavior-preserving replacement or improve its JSDoc type; see [`sfcc/prefer-explicit-empty-check`](rules/sfcc/prefer-explicit-empty-check.md). |
| Java-style `String.equals(...)`                     | Lint error   | Use strict equality; see [`sfcc/no-string-equals`](rules/sfcc/no-string-equals.md).                                                                     |
| `String.raw`                                        | Lint error   | Use an escaped string literal; see [`sfcc/no-string-raw`](rules/sfcc/no-string-raw.md).                                                                 |
| `.ds` file                                          | Lint error   | Rename it to `.js`; see [`sfcc/no-ds-files`](rules/sfcc/no-ds-files.md).                                                                                |
| `default xml namespace = "..."` or `for each (...)` | Parser error | Rewrite it before lint rules can run.                                                                                                                   |

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

## Package history and migration

This package was originally maintained and published as `@jenssimon/eslint-config-sfcc`. Version 5.0.0 of that package introduced ESLint Flat Config and the breaking changes described below. Development continued under the `@jenssimon` scope before the package moved to Commerce Klaus as `@commerce-klaus/eslint-config-sfcc`, whose release history starts at version 1.0.0.

If you use `@jenssimon/eslint-config-sfcc` version 4 or earlier, migrate both the ESLint configuration format and the package name. If you already use version 5 or later under the `@jenssimon` scope, your configuration is already based on Flat Config; update the dependency and imports to the `@commerce-klaus` package name and review the current configuration API.

### Migrating from @jenssimon/eslint-config-sfcc <= v4

This is a major release with breaking changes.

### What changed

**ESLint Flat Config**
The package now uses the [flat config format](https://eslint.org/docs/latest/use/configure/configuration-files) (`eslint.config.js`). The legacy `.eslintrc`-based format is no longer supported.

**Focus: compatibility, not formatting**
The config no longer enforces any code style or formatting rules. Its sole purpose is to detect JavaScript features that are not supported by the SFCC script runtime. Formatting should be handled separately, e.g. with [Prettier](https://github.com/prettier/prettier) or [Oxfmt](https://github.com/oxc-project/oxc).

**No more base config**
The previous version extended [`@jenssimon/eslint-config-base`](https://github.com/jenssimon/eslint-config-base) (Airbnb style guide). This dependency has been removed entirely. Rules like `comma-dangle`, `no-var`, `import/*`, `consistent-return`, etc. are no longer part of this config.

**[`eslint-plugin-es5`](https://github.com/nkt/eslint-plugin-es5) → [`eslint-plugin-es`](https://github.com/mysticatea/eslint-plugin-es)**
The old `eslint-plugin-es5` has been replaced by [`eslint-plugin-es`](https://github.com/mysticatea/eslint-plugin-es). Rules have been mapped accordingly.

**No more SiteGenesis / SFRA configs**
The `sfra` and `sfra-storefront` configurations have been removed. These configurations were specific to SFRA and SiteGenesis and are not part of this general-purpose SFCC config. The external `eslint-plugin-sitegenesis` dependency is no longer used — `sitegenesis/no-global-require` is now built in, and the general SFCC script runtime rules live in the built-in `sfcc` plugin.

### Migration steps

1. Replace `.eslintrc.*` with `eslint.config.js`
2. Update the package name and import (see [Usage](#recommended-config) above)
3. Remove [`@jenssimon/eslint-config-base`](https://github.com/jenssimon/eslint-config-base), [`eslint-plugin-es5`](https://github.com/nkt/eslint-plugin-es5), and [`eslint-plugin-sitegenesis`](https://www.npmjs.com/package/eslint-plugin-sitegenesis) from your dependencies — `sitegenesis/no-global-require` is built in and the general SFCC script runtime rules are now `sfcc/*`
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
