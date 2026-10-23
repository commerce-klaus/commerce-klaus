# Cartridges and cartridge paths

Cartridges are the basic units used to organize and deploy application code in Salesforce Commerce Cloud. A **cartridge path** selects cartridges for a site and defines their precedence.

These concepts belong to the platform, not to Commerce Klaus. The tools use them consistently so local analysis and tests follow the same structure as the [SFCC script runtime](/guide/sfcc-script-runtime).

## What is a cartridge?

A cartridge is a named directory with a `cartridge/` subdirectory. It can contain server-side JavaScript, templates, static assets, forms, configuration, and metadata:

```text
cartridges/
└── app_custom/
    └── cartridge/
        ├── controllers/
        ├── scripts/
        ├── templates/
        └── static/
```

`app_custom` is the cartridge name. The outer `cartridges/` directory is only a project convention for keeping multiple cartridges together; it is not itself a cartridge.

Cartridge names often communicate a role, for example `app_*`, `int_*`, or `bm_*`. These prefixes are conventions. They do not establish dependencies or precedence by themselves.

## What is a cartridge path?

A cartridge path is the ordered list of cartridges active for a site or tool invocation. Salesforce commonly represents it as a colon-separated value:

```text
app_brand:app_core:app_storefront_base:modules
```

Read the path from left to right:

1. `app_brand` has the highest precedence.
2. `app_core` is considered next.
3. `app_storefront_base` follows.
4. `modules` has the lowest precedence in this path.

The order is application behavior, not a display preference. If more than one cartridge provides the same resolvable resource or registration, the first applicable entry wins.

::: warning Cartridge order is behavior
Do not alphabetically sort or deduplicate an explicit cartridge path. Changing the order can change which implementation the platform uses.
:::

## How overrides work

Suppose the project contains:

```text
cartridges/
├── app_brand/cartridge/scripts/price.js
├── app_core/cartridge/scripts/price.js
└── app_storefront_base/cartridge/scripts/price.js
```

With this path:

```text
app_brand:app_core:app_storefront_base
```

the effective `*/cartridge/scripts/price` module comes from `app_brand`. Removing `app_brand` from the path or moving it behind `app_core` changes the selected module without changing the importing source.

The same first-cartridge-wins principle matters beyond ordinary modules. Cartridge order can determine effective hook registrations, job step type IDs, and other metadata-driven contracts. `module.superModule` also follows the path, but starts after the current cartridge to find the next implementation.

The path does not imply that every cartridge depends on the cartridge to its right. It only defines precedence for platform lookups that use cartridge order.

## Cartridge directory and cartridge path are different

Commerce Klaus commonly exposes both concepts as configuration:

```ts [commerce-klaus.config.ts]
import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgesDir: "cartridges",
  cartridgePath: ["app_brand", "app_core", "app_storefront_base", "modules"],
})
```

- `cartridgesDir` tells tools where cartridge directories are stored on disk.
- `cartridgePath` tells tools which cartridges participate and in which order.

A cartridge can exist below `cartridgesDir` without being part of the effective path. This is common for test cartridges, Business Manager extensions, integrations, or cartridges used by another site.

## Cartridge paths are site-specific

An SFCC instance can host multiple sites with different cartridge paths. A cartridge available in the code version is not automatically active for every site.

Site-template metadata can declare a site's path through the `custom-cartridges` value in:

```text
sites/site_template/sites/<site-id>/site.xml
```

Commerce Klaus can read this metadata when `siteTemplatePath` and `site` are configured. For local tools and CI, an explicit central configuration is also useful when the deployed site metadata is not part of the repository.

## How Commerce Klaus determines the order

<!--@include: ../_partials/cartridge-order-inference.md-->

Use the [project configuration](/guide/project-configuration) to define a shared `cartridgesDir`, explicit `cartridgePath`, or site metadata source for all Commerce Klaus packages.

## How the path affects module identifiers

Cartridge-aware module identifiers use the current path in different ways:

| Module form                 | Meaning                                                  |
| --------------------------- | -------------------------------------------------------- |
| `*/cartridge/...`           | First matching module in cartridge-path order            |
| `~/cartridge/...`           | Module in the importing file's cartridge                 |
| `<cartridge>/cartridge/...` | Module from one explicitly named cartridge               |
| `module.superModule`        | Next matching implementation after the current cartridge |
| `dw/...`                    | Platform API module; not a file from the cartridge path  |

Continue with [SFCC module resolution](/guide/sfcc-module-resolution) for file candidates, relative modules, SFRA's `server` module, and detailed `module.superModule` behavior.

## Practical rules

- Preserve the declared order exactly.
- Keep the same authoritative path in editors, tests, CI, and deployed site configuration.
- Do not infer dependency relationships from directory layout or naming prefixes.
- Do not assume that every cartridge below `cartridgesDir` is active.
- Prefer an explicit path or site metadata over the alphabetical tooling fallback.
- Treat path changes like code changes: review and test their behavioral impact.
