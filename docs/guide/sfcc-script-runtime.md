# SFCC script runtime

The **SFCC script runtime** is the server-side environment in Salesforce Commerce Cloud that executes cartridge JavaScript, including controllers, hooks, job steps, and Custom API implementations.

In this documentation, the term means the whole execution environment: the JavaScript engine, supported language features, module loading, platform APIs, and execution context. It is not a browser, Node.js, or the environment that runs your development tools.

## Rhino is the engine, not the whole environment

SFCC uses the Rhino JavaScript engine. Rhino is one part of the SFCC script runtime; its name is not a shorthand for every platform constraint.

The distinction matters when diagnosing a problem:

- **Engine behavior:** syntax support, `const` scoping quirks, and Java interoperability can depend on the engine and the platform's compatibility mode.
- **Module loading:** CommonJS exports, [cartridge-path precedence](/guide/cartridges-and-cartridge-paths), and `module.superModule` follow SFCC's module conventions.
- **Platform contracts:** `dw/*` APIs, platform globals, and metadata-defined entry points come from SFCC, not from JavaScript itself.

Commerce Klaus uses "Rhino" when discussing the engine or a specific engine behavior. Elsewhere, it uses "SFCC script runtime".

## JavaScript support depends on the target

Server-side cartridge code is JavaScript. TypeScript can check that code through JSDoc and declarations, but TypeScript source is not directly executable in the SFCC script runtime.

Supported language features and standard-library APIs depend on the target platform and the code version's compatibility mode. Modern JavaScript is welcome where the target supports it reliably; an ES5-only style is not the goal.

Syntax support and API availability are separate questions. A parser accepting an expression does not establish that the target can execute it. A successful local Node.js test does not establish that a standard-library API exists on SFCC.

See the [ESLint compatibility policy](/packages/eslint-config-sfcc/#modern-javascript-where-sfcc-supports-it) and [older compatibility modes](/packages/eslint-config-sfcc/#older-compatibility-modes) for the checks Commerce Klaus provides.

## Modules follow cartridge semantics

The SFCC script runtime uses CommonJS `require()`, `module.exports`, and `exports`, with platform-specific module lookup. Read [Cartridges and cartridge paths](/guide/cartridges-and-cartridge-paths) first for the structure and precedence behind these forms:

- `*/cartridge/...` selects the first matching module in cartridge-path order.
- `~/cartridge/...` resolves within the current cartridge.
- `module.superModule` selects the next matching implementation after the current cartridge.
- `dw/*` identifies Script API modules supplied by the platform.

These are not Node.js package-resolution rules. Installing an npm package for your development tools does not make it available to cartridge code on the platform.

See [SFCC module resolution](/guide/sfcc-module-resolution) for the complete resolution model.

## APIs and context come from the platform

The platform provides commerce APIs such as `dw/catalog/ProductMgr` and globals such as `request`, `session`, and `empty`. Their availability and behavior depend on the API and execution context; a request handler and a job step should not be assumed to have the same context.

Node.js modules and browser APIs are not supplied just because the source language is JavaScript. A storefront's frontend runtime is separate from the SFCC script runtime, even when both belong to the same project.

Hook registrations, job step definitions, and Custom API schemas also determine how scripts are invoked and what they must export. Runtime compatibility therefore includes more than valid JavaScript syntax.

Use Salesforce's [B2C Commerce Script API reference](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/index.html) to verify platform APIs and their documented availability. The `current` reference tracks the latest release; also account for your target platform and compatibility mode.

## Local tooling is not the platform

Commerce Klaus brings selected runtime constraints into local feedback loops:

- **Linting** catches known compatibility problems and invalid platform patterns.
- **Type checking** checks Script API and project-specific contracts.
- **Module adapters** reproduce cartridge-aware lookup in supported development tools.
- **The test runtime** supplies focused, deterministic implementations and mocks for local tests.

::: warning Local checks are not sandbox validation

The local test runtime is not the SFCC script runtime or a complete platform emulator. Passing local checks does not replace sandbox validation of platform behavior and integrations.

:::

## Why "Tame the SFCC Rhino"?

The slogan refers to the underlying engine. It expresses the project's aim: make the SFCC script runtime easier to work with, not replace it or pretend it behaves like Node.js.
