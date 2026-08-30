[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/eslint-config-sfcc

Shareable ESLint flat config for Salesforce Commerce Cloud (SFCC) projects.

This package continues `@jenssimon/eslint-config-sfcc` under the [Commerce Klaus](https://github.com/commerce-klaus) organization.

## Key Features Checked (Allow/Block)

**Allowed:**

- ES5 syntax and common patterns that are guaranteed to work on SFCC/Rhino
- Selected ES2015+ features that are proven to work on SFCC, including:
- `const`/`let` declarations
- Arrow functions, destructuring, template literals, and generator functions
- `String.raw`
- `Object.values(...)` and `Object.entries(...)`
- `for...of` loops
- Selected ES2015+ standard APIs documented for SFCC from API version 21.2, including `Array.from`, `Array.of`, `Array.prototype.find`, `Array.prototype.findIndex`, `String.prototype.includes`, `String.prototype.startsWith`, `String.prototype.endsWith`, `String.prototype.repeat`, `String.prototype.padStart`, `String.prototype.padEnd`, `String.fromCodePoint`, `Object.assign`, and selected `Number` validation/parsing methods

**Blocked:**

- Modern language features not supported on SFCC/Rhino (e.g. optional chaining, nullish coalescing, async/await, object spread, many ES2015+ builtins)
- Top-level `await`, dynamic `import()`, class fields, new builtins like `Map`, `Set`, `Promise`, `Symbol`, etc.
- JSX/E4X-like tag syntax (e.g. `<a/>`) that may be misparsed in JavaScript linting workflows
- SFCC-specific globals that are easy to confuse with standard JavaScript, such as `empty()`
- Features that would cause runtime or syntax errors on SFCC
- Many ES2015+ Array/String/Object methods missing in Rhino
- ECMAScript modules (`import`/`export`), as SFCC only supports CommonJS
- Common pitfalls like duplicate `const` declarations in blocks (Rhino scoping)

See the integration tests for concrete examples.

## Recommended Config

### Install

```bash
pnpm add -D eslint @commerce-klaus/eslint-config-sfcc
```

### Use in `eslint.config.js`

```js
import { defineConfig } from "eslint/config"
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  // ...
  sfcc.configs.recommended,
)
```

By default, JavaScript files under `cartridges/` are linted. Client-side and static asset folders are excluded.

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

```js
import sfcc from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"

export default sfcc
```

The preset loads both plugins and enables the supported SFCC and SiteGenesis rules. `sfcc/no-ds-files` is excluded because Oxlint ignores `.ds` files. `sfcc/no-e4x-syntax` and `sfcc/no-type-annotations` are excluded because their invalid JavaScript syntax causes Oxlint parser errors before JavaScript plugins can run.

For custom rule severities, import the rule record directly:

```js
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

```bash
pnpm add -D @typescript-eslint/parser
```

```js
import { defineConfig } from "eslint/config"
import eslintAfterOxlint from "@commerce-klaus/eslint-config-sfcc/configs/eslint-after-oxlint"

export default defineConfig(eslintAfterOxlint)
```

This config deliberately does not enable the Oxlint-compatible rules, so the second lint pass does not duplicate their diagnostics. The subpath also exports `createEslintAfterOxlintConfig()` when the cartridge path, file globs, or ignored paths differ from the defaults.

### Customize with helper

```js
import { defineConfig } from "eslint/config"
import { createRecommendedConfig } from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(
  createRecommendedConfig({
    cartridgesDir: "cartridges/",
    sfcc: {
      checkCartridgeExists: true,
      allowBareModules: ["server", "proxyquire"],
      cartridgePath: ["app_storefront", "modules", "app_custom"],
    },
  }),
)
```

---

## Built-in Plugins

This package ships two built-in ESLint plugins, both automatically registered in the recommended config:

1. `sfcc` for general SFCC/Rhino compatibility rules
2. `sitegenesis` for the SiteGenesis-specific controller rule ported from [`eslint-plugin-sitegenesis`](https://www.npmjs.com/package/eslint-plugin-sitegenesis)

### `sfcc`

The `sfcc` plugin contains the general Rhino/SFCC runtime rules:

| Rule                                                                                          | Description                                                                                                                                                                                                  | Default |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| [sfcc/no-ds-files](rules/sfcc/no-ds-files.md)                                                 | Disallows legacy `.ds` files in SFCC projects. Use `.js` files instead.                                                                                                                                      | `error` |
| [sfcc/no-e4x-syntax](rules/sfcc/no-e4x-syntax.md)                                             | Disallows JSX/E4X-like tag syntax (e.g. `<a/>`) in SFCC JavaScript to avoid parser ambiguity and unsupported runtime patterns.                                                                               | `error` |
| [sfcc/no-empty-global](rules/sfcc/no-empty-global.md)                                         | Disallows the SFCC-specific `empty(...)` global. Use explicit checks such as `.length === 0`, `Object.keys(...).length === 0`, or `.isEmpty()` instead.                                                      | `error` |
| [sfcc/no-custom-api-additional-properties](rules/sfcc/no-custom-api-additional-properties.md) | Disallows `additionalProperties` in Custom API request body schemas, since the platform does not register such endpoints.                                                                                    | `error` |
| [sfcc/no-custom-api-response-methods](rules/sfcc/no-custom-api-response-methods.md)           | Disallows legacy global `response` APIs in Custom API implementations, which must return JSON through `RESTResponseMgr`.                                                                                     | `error` |
| [sfcc/no-string-equals](rules/sfcc/no-string-equals.md)                                       | Disallows Java-style `String.equals(...)` calls in JavaScript files. Use strict equality (`===`) instead.                                                                                                    | `error` |
| [sfcc/no-type-annotations](rules/sfcc/no-type-annotations.md)                                 | Disallows type annotation syntax in JavaScript files (e.g. `const x: string = ...`, `function y(): number {}`). Rhino/E4X may accept it, but it is invalid in standard JavaScript; use JSDoc typing instead. | `error` |
| [sfcc/no-rhino-import-globals](rules/sfcc/no-rhino-import-globals.md)                         | Disallows legacy Rhino globals `importScript(...)`, `importPackage(...)`, and `importClass(...)`. Use CommonJS `require()` instead.                                                                          | `error` |
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

### Shared `sfcc` options

By default, `sfcc/valid-require-path` validates path patterns only and allows bare `server` requires.

Use `createRecommendedConfig({ sfcc: ... })` to define shared SFCC plugin options centrally. These values are exposed through ESLint `settings.sfcc`, so future `sfcc/*` rules can reuse them without adding per-rule options.

```js
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

### Rhino const strategy example

Example:

```js
function route() {
  let topLevel = 1 // sfcc/prefer-const -> const

  for (let i = 0; i < 3; i += 1) {
    const loopValue = i * 2 // sfcc/rhino-const-compat -> let
    process(loopValue)
  }

  if (flagA) {
    const temp = 1 // with another nested const temp below: sfcc/rhino-const-conflict -> let
    process(temp)
  }
  if (flagB) {
    const temp = 2 // sfcc/rhino-const-conflict -> let
    process(temp)
  }

  return topLevel
}
```

### Direct plugin usage

```js
import { defineConfig } from "eslint/config"
import eslintConfigSfcc, {
  sfcc as sfccPlugin,
  sitegenesis,
} from "@commerce-klaus/eslint-config-sfcc"

export default defineConfig(eslintConfigSfcc.configs.recommended, {
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

### Decision matrix: `const` vs `let`

- Function top-level (`function route() { ... }`) and never reassigned: use `const` (`sfcc/prefer-const`)
- Loop header (`for (const x of xs)`, `for (const k in obj)`, `for (const i = 0; ...)`): use `let` (`sfcc/rhino-const-compat`)
- Declaration inside a loop body: use `let` (`sfcc/rhino-const-compat`)
- Nested block with unique name in same function: `const` is allowed
- Nested block with same `const` name reused in sibling/other nested blocks of same function: use `let` (`sfcc/rhino-const-conflict`)

### Mini-FAQ

Q: Is this safe?

```js
if (foo === "bar") {
  const value = 1
}
```

A: Yes. A single nested-block `const` with a unique name in that function is allowed.

Q: What about this?

```js
if (foo === "bar") {
  const test = 1
}

if (foo === "baz") {
  const test = 2
}
```

A: Not safe for Rhino. Both declarations are treated as function-scoped const bindings with the same name. `sfcc/rhino-const-conflict` reports this and auto-fixes to `let`.

Q: Are `XML` and `XMLList` identifiers allowed?

A: Yes. Constructor-style usage such as `const xmlCtor = XML` and `const xmlListCtor = XMLList` is allowed. `sfcc/no-e4x-syntax` only targets JSX/E4X-like tag syntax (for example `<a/>`).

Q: Are type annotations allowed in `.js` files?

A: No. `sfcc/no-type-annotations` reports annotation syntax in JavaScript files (for example `const x: string = "foo"` or `function y(): number {}`). Rhino/E4X may accept this syntax, but `.js` here follows standard JavaScript where it is invalid. Use JSDoc types instead.

Q: Are legacy Rhino import globals allowed?

A: No. `sfcc/no-rhino-import-globals` reports `importScript(...)`, `importPackage(...)`, and `importClass(...)` and points you to CommonJS `require()` instead.

Q: Is `empty()` allowed?

A: No. `sfcc/no-empty-global` reports the SFCC-specific `empty(...)` global and nudges you toward explicit checks such as `.length === 0`, `Object.keys(...).length === 0`, or `.isEmpty()` depending on the value type.

Q: Is `String.equals(...)` allowed?

A: No. `sfcc/no-string-equals` reports Java-style `.equals(...)` calls and suggests strict equality (`===`) instead.

Q: Are `.ds` files still allowed?

A: No. `sfcc/no-ds-files` reports `.ds` files and enforces `.js` files instead.

Q: What suggestion is shown for multiline static markup?

A: For static multiline JSX/E4X-like markup, `sfcc/no-e4x-syntax` suggests converting to `XML(\`...\`)`. For dynamic markup (for example with `{value}`), no conversion suggestion is offered.

Q: Does `sfcc/no-e4x-syntax` report `default xml namespace = "..."`?

A: No. That construct fails during parsing before rules run, so ESLint reports a fatal parsing error first. The rule cannot execute on code that does not parse.

Q: Is `for each (x in y)` allowed?

A: No. `for each` is Rhino/E4X-era syntax and not valid modern JavaScript, so ESLint fails with a parsing error before rules run. Treat it as unsupported project syntax and migrate to standard constructs such as `for (x of y)`.

### Migration recipes (Rhino/E4X -> modern JS)

Use these patterns when modernizing legacy SFCC code.

1. Iterate values (`for each` -> `for...of`)

Before:

```js
for each (item in items) {
  process(item)
}
```

After:

```js
for (const item of items) {
  process(item)
}
```

2. Iterate object keys and values (legacy `for each` on objects -> explicit key/value handling)

Before:

```js
for each (value in obj) {
  process(value)
}
```

After:

```js
for (const key in obj) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    const value = obj[key]
    process(value)
  }
}
```

3. Replace E4X literal markup with explicit XML construction

Before:

```js
const payload = (
  <request>
    <id>{id}</id>
  </request>
)
```

After:

```js
const payload = XML(`<request><id>${id}</id></request>`)
```

Notes:

- `default xml namespace = "..."` is also parser-incompatible in modern JS/ESLint and must be refactored manually.

---

## Migrating from @jenssimon/eslint-config-sfcc <= v4

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
