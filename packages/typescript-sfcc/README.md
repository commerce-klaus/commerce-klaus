[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/typescript-sfcc

TypeScript tooling for Salesforce Commerce Cloud cartridge projects.

The package currently ships two main entry points:

- a tsserver plugin that resolves SFCC-specific module patterns such as `~/...`, `*/...`, cartridge aliases, and `module.superModule`
- a CLI that typechecks cartridge projects with the same resolution behavior

## Install

```bash
pnpm add -D @commerce-klaus/typescript-sfcc typescript @salesforce/b2c-cli
```

## SFCC Script Types Setup

`@commerce-klaus/typescript-sfcc` is compatible with Salesforce `b2c-script-types` output.

For `dw/*` imports, the tool resolves types from a vendored workspace path:

- `.b2c-script-types/types/dw/*`

The path is calculated relative to each project config, so both setups are supported:

- `cartridges/jsconfig.json`
- `cartridges/<cartridge>/jsconfig.json`

Example workflow with the B2C Developer Tooling CLI:

```bash
b2c setup ide vscode-types --copy --force --output .b2c-script-types/jsconfig.generated.json
```

Notes:

- `sfcc-dts` is not required for `dw/*` resolution in this package.
- Keep `.b2c-script-types/types` available in the workspace before running `sfcc-ts-typecheck`.
- `sfcc-ts-sync-types` extends `b2c-script-types` by reading all XML files under `sites/site_template/meta/*.xml` and generating custom attribute declarations into `.b2c-script-types/types/sfcc-custom-attributes.generated.d.ts`.
- The generated declarations are consumed by both `sfcc-ts-typecheck` and the tsserver plugin, so editor diagnostics and CLI diagnostics use the same custom attribute typing.
- The generated declarations also patch `dw/object/SystemObjectMgr` so supported `type` literals narrow `getAllSystemObjects`, `querySystemObject`, and `querySystemObjects` to the matching system object class.
- Custom attribute values are inferred by metadata type. For enums, `select-multiple-flag=true` is treated as a multi-value enum and emitted as `SfccEnumValue<T>[]`.
- Attribute type values follow Salesforce metadata schema (`metadata.xsd`), where enum multi-select is modeled via `enum-of-*` plus `select-multiple-flag=true` (not via `set-of-enum-of-*`).

Custom attribute mapping reference:

| Metadata type                                            | Generated TypeScript type                 |
| -------------------------------------------------------- | ----------------------------------------- |
| `boolean`                                                | `boolean`                                 |
| `date`, `datetime`                                       | `Date`                                    |
| `double`, `int`, `integer`, `long`, `number`, `quantity` | `number`                                  |
| `email`, `html`, `password`, `string`, `text`, `url`     | `string`                                  |
| `enum-of-string` (with value-definitions)                | `SfccEnumValue<"value1" \| "value2" ...>` |
| `enum-of-int` (with value-definitions)                   | `SfccEnumValue<1 \| 2 ...>`               |
| `enum-of-*` with `select-multiple-flag=true`             | `SfccEnumValue<...>[]`                    |
| `enum-of-*` (without value-definitions)                  | `SfccEnumValue<baseType>`                 |
| unknown `enum-of-*`                                      | `SfccEnumValue<string \| number>`         |
| `set-of-string`                                          | `string[]`                                |
| `set-of-int`, `set-of-double`                            | `number[]`                                |
| invalid `set-of-enum-of-*` (not in `metadata.xsd`)       | `unknown[]`                               |
| unknown `set-of-*`                                       | `unknown[]`                               |
| unsupported/unknown single-value type                    | `unknown`                                 |

Example (`Product.custom`):

```ts
import ProductMgr = require("dw/catalog/ProductMgr")

const product = ProductMgr.getProduct("my-product-id")

if (product) {
  // enum-of-string -> SfccEnumValue<...>
  const status = product.custom.status
  if (status) {
    const value = status.getValue()
    const label = status.getDisplayValue()
    void value
    void label
  }

  // enum-of-int + select-multiple-flag=true -> SfccEnumValue<...>[]
  const modes = product.custom.modes
  if (modes && modes.length > 0) {
    const firstModeValue = modes[0].getValue()
    void firstModeValue
  }

  // unknown custom attribute -> TypeScript error
  // @ts-expect-error Property 'doesNotExist' does not exist
  product.custom.doesNotExist
}
```

Schema-driven assumptions:

- The generator follows the Salesforce metadata schema namespace `http://www.demandware.com/xml/impex/metadata/2006-10-31`.
- Type inference uses these fields from attribute definitions:
  - `type`
  - `value-definitions` and `value-definition/value`
  - `select-multiple-flag` (for enum multi-select)
  - `mandatory-flag` (required vs optional property)
- Supported metadata roots are `type-extension/custom-attribute-definitions` and `custom-type/attribute-definitions`.
- `type-extension` object types are assigned to `dw/*` modules via a preferred mapping table for known SFCC system objects (for example `Product` -> `dw/catalog/Product`, `Order` -> `dw/order/Order`).
- If no preferred mapping exists, a system object type is only assigned when its `dw/*` basename match is unique; ambiguous matches are skipped.
- For enum attributes, multi-value behavior is derived from `select-multiple-flag=true`.
- For set attributes, valid values follow `metadata.xsd` (`set-of-string`, `set-of-int`, `set-of-double`); non-schema variants fall back to `unknown[]`.

Recommended `package.json` scripts:

```json
{
  "scripts": {
    "types:sfcc:sync": "sfcc-ts-sync-types --min-version 26.7.0",
    "types:sfcc:sync:force": "sfcc-ts-sync-types --force",
    "prepare": "pnpm types:sfcc:sync",
    "typecheck:cartridges": "sfcc-ts-typecheck"
  }
}
```

If your CI install uses `--ignore-scripts`, run `pnpm types:sfcc:sync` explicitly before `sfcc-ts-typecheck`.

## tsserver Plugin

Add the plugin to your cartridge `jsconfig.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@commerce-klaus/typescript-sfcc" }]
  }
}
```

## CLI

The package ships these CLI binaries:

- `sfcc-ts-typecheck`
- `sfcc-ts-sync-types`

Default behavior (no flags):

- searches from the current working directory upwards for `cartridges/jsconfig.json`
- if no `references` are present, it typechecks the given config itself

Basic calls:

```bash
pnpm exec sfcc-ts-typecheck
pnpm exec sfcc-ts-typecheck --project cartridges/jsconfig.json
pnpm exec sfcc-ts-typecheck --project cartridges/tsconfig.json
```

If your project config is outside the cartridges folder, pass the cartridges root explicitly:

```bash
pnpm exec sfcc-ts-typecheck --project config/tsconfig.cartridges.json --cartridges-dir cartridges
```

`package.json` example:

```json
{
  "scripts": {
    "typecheck:cartridges": "sfcc-ts-typecheck --project cartridges/tsconfig.json"
  }
}
```

Exit codes:

- `0`: no diagnostics
- `2`: diagnostics found
- `1`: runtime/config error (for example missing config file)

`sfcc-ts-sync-types` options:

- `--min-version X.Y.Z`: refreshes types if vendored version is older than required
- `--force`: always refreshes vendored types
- `--output <path>`: optional output path for generated `jsconfig` metadata

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/typescript-sfcc
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/typescript-sfcc
