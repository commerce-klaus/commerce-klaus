[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/sfcc-module-resolver

Shared SFCC cartridge path and module resolution utilities.

## Shared resolution model

<!--@include: ../../_partials/sfcc-module-resolution.md-->

<!--@include: ../../_partials/sfcc-module-resolution-guide-link.md-->

At the API level, this package also centralizes cartridge-order detection, `hooks.json` registration lookups, and `steptypes.json` job-step discovery.

## Why this package?

Before centralization, resolution logic was spread across multiple packages, which made edge-case drift likely.
With this package, all consumers use the same rules and fallback stack.

Typical consumers in this monorepo:

- `@commerce-klaus/typescript-sfcc`
- `@commerce-klaus/eslint-config-sfcc`
- `@commerce-klaus/babel-plugin-sfcc-modules`
- `@commerce-klaus/vite-plugin-sfcc-modules`
- `@commerce-klaus/b2c-plugin`

## Installation

Inside this workspace:

```json{3} [package.json]
{
  "dependencies": {
    "@commerce-klaus/sfcc-module-resolver": "workspace:*"
  }
}
```

## Quick start

```ts{2,5-8,11,14} [resolver.ts]
import path from "node:path"
import { createSfccModuleResolver, inferCartridgeOrder } from "@commerce-klaus/sfcc-module-resolver"

const cwd = process.cwd()
const cartridgeRoots = inferCartridgeOrder({
  cartridgesDir: "cartridges",
  cwd,
})

const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)

const importer = path.resolve("cartridges/app_custom/cartridge/controllers/Home.js")
const resolved = resolveSfccModule("*/cartridge/scripts/util", importer)
```

## Cartridge order (priority)

<!--@include: ../../_partials/cartridge-order-inference.md-->

## API overview

### Constants

- `SUPPORTED_RUNTIME_EXTENSIONS`: `readonly ["js", "ds", "json"]`
- `SUPER_MODULE_TOKEN`: `"__sfcc_superModule__"`
- `DEFAULT_SITE_TEMPLATE_PATH`: `"sites/site_template"`

### Cartridge order and paths

- `SfccModuleResolutionOptions`
  - Shared cartridge-resolution configuration used by the Vite and Vitest adapters.
- `ResolveCartridgeRootsOptions`
  - Extends `SfccModuleResolutionOptions` with the resolver-only `containingFile` option.
- `resolveCartridgesDir(cartridgesDir, cwd): string`
- `resolveCartridgesBasePath(basePath, cwd, containingFile?): string`
- `resolveCartridgeRoots(options): string[]`
- `findCartridgesDir(startDirectory): string | undefined`
- `readSolutionReferences(solutionConfigPath): string[]`
- `resolveSiteTemplatePath(siteTemplatePath, cwd, fallbackPath?): string | undefined`
- `getSiteTemplateCartridgePath(siteTemplatePath, site, cwd): string[]`
- `inferCartridgeOrder(options): string[]`

### Module resolution

- `createSfccModuleResolver(cartridgeRoots)`
  - Returns `resolveSfccModule(moduleName, containingFile): string | undefined`
  - Supports `server`, `server/*`, `~/`, `*/`, and cartridge aliases (`app_x/cartridge/...`)
- `resolveCandidateFile(basePath, moduleName): string | undefined`
- `findContainingCartridgeRoot(filePath, cartridgeRoots): string | undefined`

### SuperModule

- `resolveSuperModuleFilePath(filePath, cartridgeRoots): string | undefined`
- `resolveSuperModuleSpecifier(filePath, cartridgeRoots): string | undefined`
  - Returns a cartridge specifier, for example `app_storefront_base/cartridge/controllers/Page`
- `transformSuperModuleSource(sourceCode, filePath, cartridgeRoots): string`
- `injectTopLevelStatement(sourceCode, statement): string`

### Hook registrations

- `findCartridgeRootForFile(filePath): string | undefined`
  - Locates the cartridge root (the directory directly under `cartridges/`) that contains a file
- `getCartridgeHooksJsonPath(cartridgeRoot): string | undefined`
  - Reads the cartridge's `package.json` and resolves its declared `hooks` path, if any
- `getHookRegistrationsFromDocument(document): HookRegistration[] | undefined`
  - Validates a parsed `hooks.json` document and returns its `{ name, script }` entries
- `findResolvedHookRegistrations(cartridgeRoots): ResolvedHookRegistration[]`
  - Discovers resolvable hook scripts in cartridge-path order and keeps the first registration for each extension point
- `resolveHookScriptPath(hooksDirectory, script): string | undefined`
  - Resolves a registration's `script` field to an existing file, trying `.js`, `.cjs`, `.mjs`, and `.ds`
- `getHookRegistrationsForScriptFile(filePath): HookRegistration[]`
  - Returns all Salesforce and project-specific hook registrations that resolve to a script file
- `getRequiredHookExportName(hookName): string | undefined`
  - Infers the required export name for Salesforce `dw.*` hooks only (the last segment of the extension point)
- `getRequiredHookExportsForScriptFile(filePath): RequiredHookExport[]`
  - Given a script file, returns every `{ hookName, exportName }` it must statically export according to its cartridge's `hooks.json`

### Job step definitions

- `getStepTypeDefinitionsFromDocument(document): StepTypeDefinition[] | undefined`
  - Validates task-oriented `script-module-step` and `chunk-script-module-step` entries from a parsed `steptypes.json`
  - Normalizes task function names, chunk sizes, and chunk lifecycle function names into discriminated definitions
  - Preserves parameter names, types, required and trim flags, and default values from both SFCC parameter container forms
  - Exposes declared status codes as a normalized string array
  - Normalizes task `timeout-in-seconds` metadata into an optional positive `timeoutSeconds` number
  - Preserves descriptions and normalizes site, organization, parallel-execution, and transactional flags from JSON booleans or SFCC string forms
- `findResolvedStepTypeDefinitions(cartridgeRoots): ResolvedStepTypeDefinition[]`
  - Reads `steptypes.json` from each cartridge root
  - Resolves module paths with the standard SFCC runtime extensions and index-module fallback
  - Keeps the first resolvable definition for each type ID in cartridge-path order

Capability fields remain optional so consumers can distinguish an omitted declaration from an explicit `false`. The resolver exposes this metadata without inferring or enforcing a job context.

### Project validation

- `validateSfccProject({ cartridgesDir, cartridgeRoots }): SfccProjectValidationResult`
  - Validates cartridge `package.json` hook declarations and `hooks.json`
  - Resolves hook scripts and job step modules
  - Validates Custom API entries, OAS schemas, operation IDs, and implementation scripts
  - Reports hook and job step registrations hidden by cartridge precedence as warnings

The result contains `ok`, `errors`, `warnings`, and a deterministic
`diagnostics` array. Each diagnostic provides a stable `code`, `severity`,
absolute source `file`, and human-readable `message`. Validation is additive:
the existing discovery APIs continue to skip malformed or unresolved entries.

### Project graph

- `createSfccProjectGraph({ cartridgesDir, cwd?, cartridgePath?, module? }): SfccProjectGraph`
  - Adds cartridge nodes and `precedes` edges in effective path order
  - Discovers JavaScript and Demandware Script files that use `module.superModule`
  - Adds resolved hooks, job steps, Custom APIs, implementation modules, and schemas
  - Accepts an optional `*/cartridge/...` module filter for focused graphs

The graph contains deterministic `nodes` and typed `edges`. Node kinds are
`cartridge`, `module`, `hook`, `job-step`, `custom-api`, and `schema`; edge kinds
are `precedes`, `overrides`, `super-module`, `implements`, and `uses-schema`.

### Utilities

- `stripExt(filePath): string`
- `toPosixPath(filePath): string`

## Examples

### 1) Resolve `*/` and `~/`

```ts
const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)

resolveSfccModule("*/cartridge/scripts/foo", importer)
resolveSfccModule("~/cartridge/scripts/local", importer)
```

### 2) Rewrite `module.superModule` in CommonJS

```ts
const nextSource = transformSuperModuleSource(source, filePath, cartridgeRoots)
```

When a fallback exists, `module.superModule` is replaced by `SUPER_MODULE_TOKEN` and a matching `require(...)` line is injected at the top of the file.
When no fallback exists, `module.superModule` is rewritten to `undefined`.

### 3) Read `site.xml`

```ts
const order = getSiteTemplateCartridgePath(
  "/workspace/sites/site_template",
  "RefArch",
  process.cwd(),
)
```

### 4) Find hook registrations and required exports for a script file

```ts{2-3,5-7} [hooks.ts]
import {
  getHookRegistrationsForScriptFile,
  getRequiredHookExportsForScriptFile,
} from "@commerce-klaus/sfcc-module-resolver"

const registrations = getHookRegistrationsForScriptFile(scriptPath)
// [{ name: "dw.ocapi.shop.basket.afterPOST", script: "./hooks/basket" }]

const requiredExports = getRequiredHookExportsForScriptFile(
  scriptPath,
)
// [{ hookName: "dw.ocapi.shop.basket.afterPOST", exportName: "afterPOST" }]
```

### 5) Discover job step definitions

```ts
import { findResolvedStepTypeDefinitions } from "@commerce-klaus/sfcc-module-resolver"

const definitions = findResolvedStepTypeDefinitions(cartridgeRoots)
const exportStep = definitions.find((definition) => definition.typeId === "custom.ExportProducts")

if (exportStep?.kind === "chunk-script-module-step") {
  console.log(exportStep.modulePath)
  console.log(exportStep.chunkSize)
  console.log(exportStep.functions.read)
}
```

Malformed documents and definitions whose modules cannot be resolved are skipped during filesystem discovery. Duplicate type IDs use the same first-cartridge-wins priority as module and hook resolution.

Each definition exposes normalized `parameters` and `statusCodes` arrays. Empty parameter containers and missing status declarations become empty arrays. Boolean metadata flags accept both JSON booleans and SFCC's string forms (`"true"` and `"false"`); default values remain lossless so consumers can apply runtime-specific conversion.

### 6) Validate project contracts

```ts
import { validateSfccProject } from "@commerce-klaus/sfcc-module-resolver"

const validation = validateSfccProject({
  cartridgesDir: path.resolve("cartridges"),
  cartridgeRoots,
})

for (const diagnostic of validation.diagnostics) {
  console.log(diagnostic.code, diagnostic.file, diagnostic.message)
}
```

### 7) Build a project graph

```ts
import { createSfccProjectGraph } from "@commerce-klaus/sfcc-module-resolver"

const graph = createSfccProjectGraph({
  cartridgesDir: path.resolve("cartridges"),
  cartridgePath: ["app_custom", "app_storefront_base"],
})

for (const edge of graph.edges) {
  console.log(edge.kind, edge.from, edge.to)
}
```

## Design decisions

- A central resolver core with consumer-specific adapters kept in each package.
- Filesystem-based resolution is intentionally Node-only.
- Return formats are deterministic: absolute file paths for resolver hooks, cartridge-based specifiers for super module references.

## Development

```bash
vp test
vp check
vp pack
```

If consumer tests in other packages need this resolver and exports point to `dist/*`, build this package first:

```bash
cd packages/sfcc-module-resolver
vp pack
```

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/sfcc-module-resolver
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/sfcc-module-resolver
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/sfcc-module-resolver
