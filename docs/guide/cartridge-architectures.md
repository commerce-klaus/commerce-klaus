# Cartridge architectures

Commerce Klaus uses cartridge architectures to apply intentional storefront
boundaries consistently across linting and tests. They describe how a cartridge
participates in a project; they do not attempt to detect or replace the SFCC
runtime architecture.

<!--@include: ../_partials/cartridge-architectures.md-->

## How assignments work

Assign architecture labels centrally in `commerce-klaus.config.ts`:

```ts [commerce-klaus.config.ts]
import { defineConfig } from "@commerce-klaus/config"

export default defineConfig({
  cartridgePath: ["app_headless", "bc_custom_api", "app_storefront_base", "bm_tools", "modules"],
  architectures: {
    "storefront-next": ["app_headless", "bc_custom_api"],
    sfra: ["app_storefront_base"],
    "sitegenesis-controllers": ["bm_tools"],
  },
})
```

Each cartridge can have at most one architecture. Commerce Klaus rejects
unknown labels and ambiguous assignments instead of relying on configuration
order. A cartridge can remain unassigned when it is shared infrastructure or
when no architecture-specific policy should apply.

Architecture assignments complement the
[cartridge path](/guide/cartridges-and-cartridge-paths). The path still decides
precedence; the assignment decides which policy or selection label applies to
each named cartridge.

## Architecture profiles

### Storefront Next

Use `storefront-next` for cartridges that support a Storefront Next project
without implementing an SFRA storefront layer.

- **Expected boundary:** no SFRA controllers, forms, `server` module, storefront
  ISML response rendering, or Pipeline API.
- **Module policy:** use `~/` for local modules and named paths for explicit
  cross-cartridge dependencies instead of `*/`.
- **Watch for:** Custom APIs, hooks, and job steps are not prohibited merely
  because a cartridge is headless. Apply their dedicated rules when the project
  needs stricter boundaries.

### PWA

Use `pwa` for cartridges serving a PWA storefront through APIs and headless
integration points rather than SFRA controller conventions.

- **Expected boundary:** currently the same enforced boundary as
  `storefront-next`.
- **Separate identity:** keeping `pwa` distinct records architectural intent
  and allows the policies to diverge without renaming project assignments.
- **Watch for:** the label classifies server-side cartridges; it does not lint
  or configure the separately deployed storefront application.

### SFRA

Use `sfra` for Storefront Reference Architecture cartridges built around SFRA
controllers and middleware.

- **Expected boundary:** controllers, the `server` module, forms, and storefront
  ISML rendering remain available.
- **Legacy boundary:** direct use of the SiteGenesis Pipeline API is rejected.
- **Watch for:** architecture assignment does not determine cartridge
  precedence or guarantee that `app_storefront_base` is present.

### SiteGenesis Controllers

Use `sitegenesis-controllers` for controller-based SiteGenesis cartridges that
do not use the SFRA `server` module.

- **Expected boundary:** controller modules and server-side templates remain
  valid SiteGenesis concepts.
- **Framework boundary:** SFRA's `server` module and the Pipeline API are
  rejected.
- **Watch for:** `sitegenesis/no-global-require` still applies to controller
  files and keeps route-specific dependencies local to the routes that use
  them.

### SiteGenesis Pipelines

Use `sitegenesis-pipelines` for pipeline-era SiteGenesis cartridges whose
JavaScript is invoked from pipeline definitions.

- **Expected boundary:** this is the only architecture policy that permits
  `dw/system/Pipeline`.
- **Framework boundary:** the SFRA `server` module remains unavailable.
- **Watch for:** the policy applies to JavaScript only. Commerce Klaus does not
  validate pipeline XML through this ESLint preset.

## ESLint policy matrix

The architecture presets are overlays composed after the recommended config.
They change architecture-specific rules, not the baseline of supported
JavaScript syntax and standard-library APIs.

<!--@include: ../_partials/cartridge-architecture-eslint-policies.md-->

Use `createCartridgeArchitectureConfig()` to generate cartridge-scoped ESLint
overlays from the central assignments. Oxlint exposes the same policies through
`createOxlintArchitectureOverrides()`.

## Focused test projects

`vitest-sfcc` can filter the effective cartridge path with
`cartridgeSelection`:

```ts [vitest.config.ts]
sfccVitest({
  cartridgeSelection: {
    architectures: ["storefront-next"],
    cartridges: ["modules"],
  },
})
```

Filtering preserves the original cartridge-path order. Unassigned cartridges
are excluded by default, so shared infrastructure must be named explicitly or
included with `includeUnassigned: true`. Use separate Vitest projects when test
suites require different architecture selections.

## Choosing an assignment

Choose the label from the conventions the cartridge intentionally follows, not
from its prefix:

1. Use `storefront-next` or `pwa` for a headless boundary without SFRA
   controllers.
2. Use `sfra` when the cartridge implements SFRA controllers or middleware.
3. Use `sitegenesis-controllers` for controller-based SiteGenesis code.
4. Use `sitegenesis-pipelines` only when Pipeline API access is part of the
   architecture.
5. Leave shared cartridges unassigned when none of these storefront policies
   should govern them.
