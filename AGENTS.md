# Commerce Klaus Repository Guide

## Project Purpose

Commerce Klaus is a Vite+ monorepo of pragmatic developer tools for Salesforce
Commerce Cloud (SFCC), backed by a pnpm workspace for package and dependency
management. It brings SFCC's cartridge model, Rhino runtime constraints,
platform APIs, metadata, and CommonJS conventions into ESLint, TypeScript, Vite,
Babel, Vitest, and CI.

The project does not try to make SFCC behave like Node.js. Preserve platform
semantics and move failures from the sandbox into local feedback loops. Prefer
focused packages, explicit constraints, deterministic behavior, and incremental
adoption over broad framework abstractions or a complete platform emulator.

“Klaus” is the project's persona: a practical, down-to-earth German colleague
who handles SFCC's platform quirks without pretending they do not exist. The
tagline “Klaus is here to tame the SFCC Rhino” expresses that role: make the
runtime easier to work with, not replace or disguise it. Keep naming, examples,
documentation, and product language consistent with this understated,
no-nonsense character rather than turning Klaus into a corporate mascot or a
fantasy character.

Source code and documentation are written in English.

## Repository Map and Ownership

- `packages/sfcc-module-resolver`: the shared, Node-only source of truth for
  cartridge discovery and ordering, SFCC module resolution, super modules,
  hooks, job step definitions, and Custom API contracts. Put filesystem-based
  SFCC semantics here when more than one adapter needs them.
- `packages/eslint-config-sfcc`: ESLint and Oxlint-compatible rules for Rhino
  compatibility and statically detectable SFCC mistakes. Keep ESTree-specific
  analysis and diagnostics here; reuse the shared resolver for filesystem and
  registration semantics.
- `packages/typescript-sfcc`: tsserver plugin, typecheck and type-sync CLIs, and
  generated declarations for Script API types, custom attributes, hooks, and
  Custom APIs. Keep TypeScript AST and language-service concerns here.
- `packages/vite-plugin-sfcc-modules`: cartridge-aware resolution and CommonJS
  transformation for general Vite consumers. It does not provide an SFCC test
  runtime.
- `packages/babel-plugin-sfcc-modules`: the equivalent transformation adapter
  for Babel-based pipelines.
- `packages/sfcc-test-runtime`: framework-independent, deterministic SFCC
  module mocks, globals, and harnesses for controllers, hooks, and job steps.
  It intentionally has no Vite, Vitest, cartridge-discovery, or filesystem
  responsibility.
- `packages/vitest-sfcc`: composes the shared resolver and test runtime with
  Vite/Vitest module loading. Consumers should not configure it together with
  `vite-plugin-sfcc-modules`, and normally import runtime APIs through
  `@commerce-klaus/vitest-sfcc/runtime` rather than installing the runtime
  package directly.
- `examples`: executable consumer setups. Update them when a public setup or
  integration contract changes.
- `docs`: the VitePress user guide and package reference. Public behavior and
  configuration changes must be reflected here and, where applicable, in the
  package README.
- `cartridges` and package-local `tests/cartridges`: SFCC-shaped examples and
  fixtures, not general application source.

Dependency direction flows from adapters toward the shared cores:

```text
eslint-config-sfcc ----\
typescript-sfcc -------+--> sfcc-module-resolver
vite-plugin-sfcc ------+
babel-plugin-sfcc -----/

vitest-sfcc --> sfcc-module-resolver
						 \-> sfcc-test-runtime
```

Do not copy shared resolution or metadata parsing into an adapter. Keep
tool-specific ASTs, diagnostics, transforms, and lifecycle integration at the
adapter boundary.

## Core SFCC Concepts

### Cartridge Paths and Precedence

A cartridge is a named package-like directory containing a `cartridge/`
folder. A cartridge path is the ordered list of cartridges active for a site or
tool invocation, commonly written as a colon-separated value such as
`app_custom:app_storefront_base:modules`. Entries on the left have higher
precedence. If both `app_custom` and `app_storefront_base` contain the requested
module, the implementation from `app_custom` wins.

This order is part of SFCC runtime behavior, not merely a filesystem search
convenience. It determines which cartridge overrides another, which hook or job
step registration is effective, and which implementation is the next
`module.superModule`. Do not sort or deduplicate an explicit path in a way that
changes precedence, and do not infer dependencies between cartridges solely
from their directory layout.

The shared resolver understands these module forms:

- `*/cartridge/...`: first matching module in cartridge-path order.
- `~/cartridge/...`: module in the importer's own cartridge.
- `<cartridge>/cartridge/...`: explicit cartridge alias.
- `server` and `server/*`: SFRA server modules.
- `dw/*`: SFCC Script API modules, supplied as types, lint knowledge, runtime
  implementations, or user mocks depending on the consumer.
- relative paths and `.js`, `.ds`, and `.json` runtime extensions.

`inferCartridgeOrder()` establishes the canonical precedence: explicit
`cartridgePath`, configured or environment `SFCC_CARTRIDGE_PATH`, solution
`jsconfig` references, a site's `custom-cartridges` value, then a deterministic
alphabetical filesystem fallback. Preserve first-cartridge-wins behavior for
modules, hooks, job step type IDs, and similar registrations.

### Super Modules

`module.superModule` means the next matching implementation after the current
cartridge, not simply another alias for `*/`. Transformations must be scoped to
cartridge modules, preserve top-level directive placement, support transitive
inheritance, and produce `undefined` when no fallback exists.

### Runtime Compatibility

SFCC server-side code is CommonJS JavaScript running under platform-specific
Rhino constraints. Runnable cartridge code and runnable test fixtures must be
`.js` with JSDoc and `checkJs`/`allowJs`, never TypeScript. TypeScript is used for
the tooling implementation, declarations, tests of tooling APIs, and config.

Do not introduce Node.js, browser, or modern ECMAScript behavior into cartridge
code unless the target SFCC runtime supports it. Platform globals such as
`request`, `session`, `customer`, and `empty` need explicit lint, type, or test
runtime treatment.

Use the official [B2C Commerce Script API reference](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/index.html)
to verify `dw/*` classes, methods, globals, API versions, and deprecations. The
`current` documentation tracks the latest platform release; respect a consumer
project's configured compatibility version when availability differs by release.

### Metadata-Driven Contracts

SFCC behavior also comes from files rather than JavaScript imports:

- cartridge `package.json` and `hooks.json` define hook registrations;
- `steptypes.json` defines task and chunk job modules and lifecycle functions;
- `rest-apis/**/api.json` plus OAS schemas define Custom API operations;
- site-template metadata XML defines custom and system object attributes;
- `site.xml` can define the effective cartridge path.

Parse these formats structurally, normalize accepted SFCC representations, and
resolve referenced modules through the shared resolver. Malformed or unresolved
entries should follow the owning API's established skip/diagnostic behavior;
do not invent adapter-specific interpretations.

### Types and Test Runtime

`typescript-sfcc` consumes the `b2c-script-types` output provided by Salesforce's
[B2C Developer Tooling](https://github.com/SalesforceCommerceCloud/b2c-developer-tooling)
under `.b2c-script-types/types`. Treat those Script API declarations as the
upstream baseline; Commerce Klaus extends them with generated project
declarations rather than maintaining a competing platform type set. Keep editor
and CLI behavior aligned by sharing discovery and generated inputs.

`sfcc-test-runtime` models only behavior needed for deterministic local tests.
Unknown platform modules should fail unless mocked or handled by a real-module
fallback. Add a focused implementation only when its observable semantics can
be represented faithfully; otherwise leave it mockable. Reset runtime modules
and process globals between tests because Vitest workers are reused.

## Recurring Engineering Patterns

- Start changes at the owning package. If two adapters need the same SFCC
  behavior, implement and test it in `sfcc-module-resolver` or
  `sfcc-test-runtime`, then keep adapter changes thin.
- Keep public option names and fallback precedence consistent across packages.
  Shared resolution options use `cwd`, `basePath`/`cartridgesDir`,
  `cartridgePath`, `envCartridgePath`, `solutionConfigPath`,
  `siteTemplatePath`, and `site` as appropriate.
- Use absolute paths internally for filesystem resolution and normalize emitted
  module paths to POSIX separators. Never make results depend accidentally on
  the command's working directory.
- Preserve CommonJS export shape when loading cartridge modules through ESM
  tooling. Test both the transformed source and execution through the consuming
  adapter when changing transforms.
- Test precedence and negative cases, not only successful lookup: missing files,
  malformed metadata, duplicate registrations, absent super modules, and an
  importer outside any cartridge are recurring boundaries.
- Prefer small filesystem fixtures that mirror real SFCC layout. Use neutral
  names such as `Example*`, `Sample*`, and `sample-*` in fixtures.
- Every JSDoc JavaScript fixture included by one `jsconfig`/`tsconfig` starts
  with `export {}` so sibling files do not leak declarations into a shared
  global script scope.
- In Vitest integration tests, register mocks before dynamically importing the
  module under test. Reset both Vitest's module cache and the active SFCC
  runtime when test isolation depends on module evaluation or globals.
- Keep generated declarations deterministic and based on Salesforce's schemas
  and vendored `b2c-script-types`; synthetic declarations must not mask
  incompatibilities with real Salesforce output.
- Treat each publishable package's `package.json` as part of its public API.
  Keep `files`, `exports`, `main`, `module`, `types`, and `bin` entries aligned
  with Vite+ pack entries and generated ESM, CommonJS, and declaration files.
  Test new or changed subpath exports through a consumer-facing import.
- `.b2c-script-types/` is ignored, reproducible upstream and generated output,
  not repository source. When type-aware examples or checks lack these files,
  build `typescript-sfcc` if needed and run the example's
  `vp run types:sfcc:sync`; do not commit the generated directory.
- VitePress navigation is maintained manually. When adding or moving docs,
  update `docs/.vitepress/config.ts`; add blog posts to both
  `docs/blog/index.md` and the Blog sidebar.
- Public behavior needs focused tests, user-facing documentation, and a
  Changeset. Internal-only refactors and test-only changes normally do not need
  a Changeset.
- Do not edit generated `dist`, coverage, or generated SFCC declaration output
  by hand. Change the source or generator and rebuild.

## Development Workflow

Use Node.js 22.12 or newer and Vite+ commands from the workspace root unless a
package-specific check is intentionally narrower.

Treat Vite+ and its `vp` CLI as the primary interface for installing
dependencies, running scripts, checking, testing, building, and publishing.
pnpm remains the underlying package manager and owns `pnpm-workspace.yaml` and
`pnpm-lock.yaml`; use it directly only where an existing repository command or
package lifecycle script explicitly requires it. Do not replace pnpm with npm or
yarn.

Packages share workspace configuration. Put common lint, format, and task
defaults in the root `vite.config.ts`; package-level `vite.config.ts` files
should contain only package-specific build entries, plugins, test resolution,
or necessary overrides. Keep common TypeScript compiler options in the root
`tsconfig.json`, and centralize shared dependency versions in the
`pnpm-workspace.yaml` catalog. Before duplicating configuration in a package,
check whether the root config or an existing shared option can express it.

```bash
vp install
vp check
vp test
vp run ready
```

- `vp check` formats, lints, and typechecks; use `vp check --fix` for mechanical
  formatting and lint fixes.
- `vp test` uses the root Vite+ configuration. A package can also run `vp test`
  from its own directory when debugging its local configuration.
- `vp run ready` is the complete pre-merge check: workspace checks, recursive
  package tests and builds, then the documentation build.
- Each package exposes `vp run test`, `vp run check`, and `vp run build`; build
  is `vp pack`.
- Workspace packages export `dist/*`. Build shared dependencies first when a
  consumer test cannot resolve a newly added or changed workspace entry point.
- Use `vp run docs:dev` for the documentation site and `vp run docs:build` for a
  production documentation check.
- Use Conventional Commits for commit messages: `type(scope): imperative
summary`, with the scope omitted when the change spans the workspace. Common
  types are `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, and `ci`.
- Use `vp run changeset` for release-relevant changes. A Changeset names every
  affected publishable package, selects the correct semantic version bump, and
  describes the user-visible result rather than repeating the commit message.
  Releases are managed by Changesets and GitHub Actions; do not hand-edit
  package versions, changelogs, or tags.
- Keep workspace dependency declarations consistent with existing package
  manifests and verify publish behavior when changing them. Release publishing
  relies on package `prepublishOnly` builds and npm Trusted Publishing.
- Renovate is the default mechanism for routine dependency updates. Its root
  `renovate.json` uses semantic commits, a minimum release age, and grouped
  branch automerge for eligible non-breaking updates; preserve explicit
  exceptions such as `eslint-plugin-es-x`. Review major and behavior-sensitive
  updates rather than bypassing Renovate policy, and keep
  `pnpm-workspace.yaml` catalogs and `pnpm-lock.yaml` synchronized.

Run the narrowest relevant package test immediately after an edit, then run
`vp check`. Use `vp run ready` before considering a cross-package or public API
change complete.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
