---
blogPost: true
title: Official Salesforce IntelliSense, project guarantees with Commerce Klaus
description: Use the official B2C Commerce editor tooling as the foundation, then add generated project contracts and repeatable CI checks with Commerce Klaus.
date: 2026-10-05
author: jenssimon
tags:
  - typescript
  - tooling
  - ci
---

The [official Salesforce B2C Commerce IDE Extension](https://salesforcecommercecloud.github.io/b2c-developer-tooling/vscode-extension/) is a capable foundation for developing cartridges in VS Code, Cursor, and other compatible editors. It provides autocomplete and hover documentation for `dw/*` Script API modules and recognizes legacy `.ds` scripts without requiring a generated project configuration. It also brings cartridge sync, sandbox management, and server-side script debugging into the editor.

The wider [Salesforce B2C Developer Tooling](https://salesforcecommercecloud.github.io/b2c-developer-tooling/) also bundles Salesforce XSD schemas and supports XML validation through its CLI. Schema validation checks metadata structure; it does not turn a project's attribute definitions into concrete JavaScript types. The IDE extension also does not run a project-wide typecheck that can run in CI.

Commerce Klaus is designed to fill those gaps rather than replace the Salesforce tooling.

## TL;DR

- Let the [Salesforce extension](https://salesforcecommercecloud.github.io/b2c-developer-tooling/vscode-extension/) own Script API IntelliSense and standard cartridge resolution in VS Code.
- Generate project-specific declarations from metadata, hooks, Custom APIs, and job steps with Commerce Klaus.
- Keep cartridge source as the JavaScript that SFCC executes, adding JSDoc where an explicit boundary is useful.
- Run `b2c klaus types check` in CI so correctness does not depend on which editor a developer uses.
- Use the wider Commerce Klaus packages when linting, tests, and build tools need the same SFCC semantics.

## One stack, two responsibilities

The two toolsets solve different layers of the problem:

| Layer                                                             | Primary owner                         |
| ----------------------------------------------------------------- | ------------------------------------- |
| Script API IntelliSense and standard module resolution in VS Code | Salesforce B2C Commerce IDE Extension |
| XSD schemas and XML validation                                    | Salesforce B2C Developer Tooling CLI  |
| Types derived from project metadata and registrations             | Commerce Klaus                        |
| `module.superModule` typing                                       | Commerce Klaus                        |
| Hook registration and CommonJS export validation                  | Commerce Klaus                        |
| Repeatable project typechecking outside VS Code                   | Commerce Klaus                        |

When both TypeScript Server plugins are active, Commerce Klaus preserves an existing Salesforce resolution and only supplies a fallback for unresolved modules. Generated project declarations and `module.superModule` support remain available on top.

## From valid metadata to typed implementation

Salesforce describes `dw.catalog.Product` accurately, exposes the `ICustomAttributes` extension hook, and validates the metadata XML that defines a project's attributes. Commerce Klaus consumes those project definitions and generates the concrete TypeScript augmentation used by cartridge JavaScript and CI.

Suppose site metadata defines a numeric warranty period:

```xml{3-6} [meta/system-objecttype-extensions.xml]
<type-extension type-id="Product">
  <custom-attribute-definitions>
    <attribute-definition attribute-id="warrantyPeriodMonths">
      <type>int</type>
      <mandatory-flag>false</mandatory-flag>
    </attribute-definition>
  </custom-attribute-definitions>
</type-extension>
```

The official types provide the `Product` API and its extension point. Commerce Klaus reads the metadata and augments that extension point with the project's custom attributes. The resulting feedback is specific to the project:

```js{6-8,12} [cartridge/scripts/productWarranty.js]
// @ts-check

const ProductMgr = require("dw/catalog/ProductMgr")

function warrantyLabel(productId) {
  const product = ProductMgr.getProduct(productId)
  if (!product || product.custom.warrantyPeriodMonths === undefined) {
    return "No warranty"
  }

  // Error: Property 'toUpperCase' does not exist on type 'number'.
  return product.custom.warrantyPeriodMonths.toUpperCase()
}

module.exports = warrantyLabel
```

The metadata declares `warrantyPeriodMonths` as `int`, so the generated declaration makes it a number. TypeScript therefore reports the invalid string method directly on `toUpperCase()`. The corrected implementation uses the numeric value without a cast:

```js{1}
return `${product.custom.warrantyPeriodMonths} months`
```

A misspelled attribute is reported in the same way. If the metadata changes, the generated declaration changes with it and the affected implementation is checked again.

No handwritten copy of the attribute interface is required.

## From the official baseline to CI

Synchronizing types first refreshes Salesforce's `b2c-script-types` output and then generates the declarations owned by Commerce Klaus:

- custom and system object attributes from site metadata
- hook aliases from Salesforce declarations and cartridge registrations
- operation types from Custom API OpenAPI schemas
- parameter and lifecycle types from `steptypes.json`

Install the Commerce Klaus plugin and its TypeScript engine with the package manager used by the project:

::: code-group

```bash [pnpm]
pnpm add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [Yarn]
yarn add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [npm]
npm install -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [Vite+]
vp install -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

:::

Register the project-local plugin once, then synchronize and check types through the official B2C CLI:

::: code-group

```bash [pnpm]
pnpm exec b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install
pnpm exec b2c klaus types sync
pnpm exec b2c klaus types check
```

```bash [Yarn]
yarn exec b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install
yarn exec b2c klaus types sync
yarn exec b2c klaus types check
```

```bash [npm]
npm exec -- b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install
npm exec -- b2c klaus types sync
npm exec -- b2c klaus types check
```

```bash [Vite+]
vp exec b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install
vp exec b2c klaus types sync
vp exec b2c klaus types check
```

:::

For CI, `status` can verify generated output without changing files before the full typecheck runs:

::: code-group

```bash [pnpm]
pnpm exec b2c klaus types status --min-version 26.7.0
pnpm exec b2c klaus types check --project cartridges/jsconfig.json
```

```bash [Yarn]
yarn exec b2c klaus types status --min-version 26.7.0
yarn exec b2c klaus types check --project cartridges/jsconfig.json
```

```bash [npm]
npm exec -- b2c klaus types status --min-version 26.7.0
npm exec -- b2c klaus types check --project cartridges/jsconfig.json
```

```bash [Vite+]
vp exec b2c klaus types status --min-version 26.7.0
vp exec b2c klaus types check --project cartridges/jsconfig.json
```

:::

The typecheck loads the project's TypeScript version, follows solution references, resolves cartridge modules with SFCC precedence, transforms `module.superModule`, and validates hook registrations. It returns a failing exit code for diagnostics, making it suitable for a pull-request check.

This is the important distinction: Salesforce validates the metadata file and provides the platform type surface in the editor. Commerce Klaus projects that metadata into the JavaScript type system and turns the combined contracts into a repeatable quality gate outside the editor.

## More than TypeScript

Type information is one part of the local feedback loop. Commerce Klaus keeps the same platform assumptions across focused packages:

- [`@commerce-klaus/eslint-config-sfcc`](/packages/eslint-config-sfcc/) catches Rhino compatibility problems, invalid SFCC patterns, and registration mistakes that types do not model.
- [`@commerce-klaus/vitest-sfcc`](/packages/vitest-sfcc/) resolves cartridge modules and provides deterministic platform mocks so real cartridge code can be tested locally.
- The [`@commerce-klaus/vite-plugin-sfcc-modules`](/packages/vite-plugin-sfcc-modules/) and [`@commerce-klaus/babel-plugin-sfcc-modules`](/packages/babel-plugin-sfcc-modules/) packages make SFCC CommonJS and cartridge imports available to their respective toolchains.
- [`@commerce-klaus/b2c-plugin`](/packages/b2c-plugin/) exposes project checks through the official Salesforce B2C CLI.

Each package can be adopted independently. Together they prevent the editor, linter, test runner, build pipeline, and CI job from inventing different answers to the same SFCC question.

## A practical division of labor

Use the [official extension](https://salesforcecommercecloud.github.io/b2c-developer-tooling/vscode-extension/) by itself when Script API completion and cartridge navigation are enough.

Add [`@commerce-klaus/typescript-sfcc`](/packages/typescript-sfcc/) when project metadata should become executable type information, `module.superModule` needs to be understood, hook registrations should be validated, or the repository needs a real command-line typecheck.

Add the other Commerce Klaus packages as the project needs stricter runtime compatibility, local cartridge tests, or SFCC-aware module loading in build tools. There is no requirement to replace the existing development setup all at once.

Salesforce supplies the authoritative platform baseline. Commerce Klaus connects that baseline to the contracts already present in the repository and makes the result enforceable before code reaches a sandbox.

See the [TypeScript tooling reference](/packages/typescript-sfcc/) for setup details and [Modernize SFCC JavaScript with confidence](/blog/modernize-sfcc-javascript-with-confidence) for the broader incremental workflow.
