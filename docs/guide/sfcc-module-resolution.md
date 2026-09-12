# Understanding SFCC module resolution

<!--@include: ../_partials/sfcc-module-resolution.md-->

This page describes the common model used throughout Commerce Klaus. Individual packages apply the model at different stages: linting validates module identifiers, TypeScript resolves them for editor features and type checking, build plugins make them available to Babel or Vite, and `vitest-sfcc` combines resolution with a controlled test runtime.

## The cartridge path is an ordered lookup path

An SFCC project contains cartridges, each with a `cartridge/` directory. The active cartridge path is an ordered list such as:

```text
app_brand:app_core:app_storefront_base:modules
```

Read the path from left to right. `app_brand` has the highest precedence, followed by `app_core`, then `app_storefront_base`, and finally `modules`.

Suppose these files exist:

```text
cartridges/
├── app_brand/cartridge/scripts/price.js
├── app_core/cartridge/scripts/price.js
└── app_storefront_base/cartridge/scripts/price.js
```

The expression below resolves to the file in `app_brand` because it is the first matching cartridge:

```js
const price = require("*/cartridge/scripts/price")
```

Reordering the cartridge path can therefore change application behavior without changing the source of the importing module.

::: warning Cartridge order is behavior
Do not alphabetically sort or deduplicate an explicit cartridge path. A deterministic alphabetical scan is useful only as a tooling fallback when the project provides no authoritative order.
:::

## Resolution forms

### First match with `*/`

`*/` searches each cartridge from left to right and returns the first module with the requested path:

```js
const price = require("*/cartridge/scripts/price")
```

For the example path above, the candidates are checked in this order:

```text
app_brand/cartridge/scripts/price.js
app_core/cartridge/scripts/price.js
app_storefront_base/cartridge/scripts/price.js
modules/cartridge/scripts/price.js
```

This form is useful when callers should receive the effective implementation, including project overrides.

### Importer's cartridge with `~/`

`~/` resolves from the cartridge containing the importing file:

```js
const localConfig = require("~/cartridge/config/local")
```

If the importing file belongs to `app_core`, only this location is considered:

```text
app_core/cartridge/config/local.js
```

No other cartridge is searched. Resolution fails when the importer is outside the configured cartridge roots because there is no current cartridge to use.

### Named cartridge aliases

An explicit cartridge identifier selects that cartridge directly:

```js
const basePrice = require("app_storefront_base/cartridge/scripts/price")
```

This bypasses first-match selection. The named cartridge must still be present in the configured cartridge roots, and the requested module must exist there.

Use an explicit alias when the dependency is intentionally tied to one cartridge. Use `*/` when normal override precedence should decide which implementation is effective.

### Relative modules

Relative imports stay relative to the importing file, following normal CommonJS semantics:

```js
const formatter = require("./formatter")
const constants = require("../config/constants")
```

They do not search the cartridge path. Commerce Klaus adapters preserve them in the surrounding Vite, Babel, TypeScript, or runtime module graph.

### SFRA `server`

SFRA controllers commonly load the server module with:

```js
const server = require("server")
```

`server` and `server/*` resolve from the `modules` cartridge when filesystem-backed tooling needs their source. In `vitest-sfcc`, `server` is supplied by the controller test runtime so routes and middleware can be executed in a controlled environment.

### Platform modules with `dw/*`

Imports such as the following refer to Salesforce platform APIs:

```js
const ProductMgr = require("dw/catalog/ProductMgr")
```

They are not files in a project's cartridge path. Their treatment depends on the tool:

| Context                             | How `dw/*` is handled                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| ESLint                              | Recognized and validated as an SFCC platform module                   |
| TypeScript                          | Typed through Salesforce Script API declarations                      |
| Babel or Vite module transformation | Left as an external platform boundary unless the consumer supplies it |
| `vitest-sfcc`                       | Provided by a focused runtime implementation or an explicit test mock |

Commerce Klaus does not attempt to reproduce the entire platform locally. Runtime behavior that cannot be represented faithfully remains mockable and fails explicitly when no implementation or mock exists.

## How `module.superModule` differs from `*/`

`module.superModule` does not search from the beginning of the cartridge path. It starts immediately after the cartridge containing the current file and looks for the same relative module path.

Given:

```text
app_brand:app_core:app_storefront_base
```

and:

```text
app_brand/cartridge/controllers/Product.js
app_core/cartridge/controllers/Product.js
app_storefront_base/cartridge/controllers/Product.js
```

inside `app_brand/cartridge/controllers/Product.js`:

```js
const superModule = module.superModule
```

resolves to `app_core/cartridge/controllers/Product.js`. If that module accesses its own `module.superModule`, the next match is the implementation in `app_storefront_base`.

```mermaid
flowchart LR
  brand[app_brand/Product.js] -->|superModule| core[app_core/Product.js]
  core -->|superModule| base[app_storefront_base/Product.js]
  base -->|superModule| missing[undefined]
```

The lookup returns `undefined` when no later cartridge provides the same module. It never wraps around to a higher-precedence cartridge.

## File candidates

For an extensionless module identifier, Commerce Klaus checks supported runtime files and directory entry points. The runtime extensions are:

```text
.js
.ds
.json
```

For example, `*/cartridge/scripts/example` can resolve to a matching `example.js`, `example.ds`, `example.json`, or an `index` file with one of those extensions. Tooling may additionally resolve declaration files for type information, but declarations are not executable cartridge modules.

When an identifier contains an explicit extension, that exact candidate is preferred. Legacy `.ds` requests can fall back to a corresponding `.js` file to support migrated code.

## Where cartridge order comes from

<!--@include: ../_partials/cartridge-order-inference.md-->

## A practical decision guide

Use the module form that communicates the dependency you intend:

| Intent                                           | Module form                 |
| ------------------------------------------------ | --------------------------- |
| Load the effective implementation with overrides | `*/cartridge/...`           |
| Load a private module from the current cartridge | `~/cartridge/...`           |
| Depend deliberately on one named cartridge       | `<cartridge>/cartridge/...` |
| Extend the next lower-precedence implementation  | `module.superModule`        |
| Load a sibling or parent module directly         | `./...` or `../...`         |
| Use an SFCC platform API                         | `dw/...`                    |
| Register an SFRA controller                      | `server`                    |

The important distinction is between **selection** and **execution**. Module resolution selects what a specifier means. Type information, source transformation, platform behavior, and test mocks determine what a tool can then do with the selected module. Commerce Klaus keeps those responsibilities in separate packages while sharing the same cartridge semantics between them.
