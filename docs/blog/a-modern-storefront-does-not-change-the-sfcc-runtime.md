---
blogPost: true
title: Starting a modern storefront does not change the SFCC runtime
description: Start a Storefront Next or PWA project with explicit cartridge runtime boundaries, so the team can use modern JavaScript without learning SFCC constraints through sandbox failures.
date: 2026-10-09
author: jenssimon
tags:
  - onboarding
  - compatibility
  - storefront-next
  - pwa
  - tooling
---

You are starting a new **Storefront Next** or **PWA** project. The storefront stack feels familiar: contemporary JavaScript, typed APIs, package imports, and fast local feedback. The team can bring current frontend practices to a new implementation instead of inheriting every decision from an older storefront.

Then the project needs server-side code: perhaps a Custom API implementation, a hook, or a job step. Those files are JavaScript too, but they run in a different environment with different rules.

This is where a greenfield project can become unexpectedly frustrating. A modern storefront does not turn the Salesforce Commerce Cloud cartridge runtime into Node.js. The team still needs to account for Rhino constraints, CommonJS modules, platform APIs, metadata-driven contracts, and cartridge precedence.

Developers with SFRA, SiteGenesis, or other long-running SFCC experience will recognize many of these boundaries. Their knowledge remains valuable. The opportunity in a new Storefront Next or PWA project is to encode that knowledge from the beginning, so nobody has to rely on memory or repeat old failures to learn it.

Commerce Klaus makes that operating environment explicit in the tools the team already uses.

## The surprise is the boundary, not the language

A modern storefront and an SFCC cartridge can belong to the same product without sharing a runtime.

Storefront code follows the capabilities of its own build tools and deployment environment. Server-side cartridge code still executes on SFCC, with Rhino constraints, CommonJS modules, platform APIs, and cartridge resolution semantics. A new storefront architecture does not turn that backend into Node.js.

The boundary becomes visible as soon as storefront work crosses into a server-side cartridge. Familiar assumptions no longer reliably apply:

- Syntax accepted by a storefront build may not be supported in a cartridge.
- A standard-library method available in a local Node.js process may not exist in the target SFCC compatibility mode.
- npm packages cannot be imported as runtime dependencies by server-side cartridge code; they belong to the storefront or development toolchain, not the SFCC runtime.
- An import may be governed by cartridge precedence rather than ordinary package resolution.
- A function's contract may come from platform metadata rather than a nearby TypeScript interface.

This is not a lack of JavaScript or SFCC experience. It is information about the target environment that the project has not made explicit.

The frustrating part is discovering that information only after uploading code, exercising an endpoint, and reading a sandbox log.

## Make the rules visible before the first mistake

An experienced SFCC developer might explain these constraints during project setup or code review. That is useful, but a conversation is not an executable contract.

Commerce Klaus puts platform knowledge into the tools developers already use. The goal is not to hide SFCC's differences. It is to make those differences visible where they affect a decision.

Instead of "we do not use that here," the developer gets a diagnostic at the expression that crosses the boundary. Instead of memorizing every metadata-defined field, they get a generated type. Instead of discovering module resolution during deployment, local tooling can use the same cartridge ordering model.

That also makes existing SFCC expertise more useful. Experienced colleagues can explain platform behavior, business logic, and the reasons behind architectural choices rather than repeatedly identifying the same unsupported syntax.

## Modern JavaScript, with a defined operating range

Starting fresh does not mean writing cartridge JavaScript as if it were still 2009.

Commerce Klaus's [ESLint compatibility policy](/packages/eslint-config-sfcc/#modern-javascript-where-sfcc-supports-it) allows modern features supported by the platform, including `const`, `let`, arrow functions, destructuring, template literals, generators, and `for...of`. It reports known runtime gaps such as classes, default parameters, spread syntax, and `Promise`.

The distinction matters: syntax support and standard-library availability are separate questions. TypeScript accepting an expression does not establish that Rhino can execute it. A passing test in Node.js does not establish that a builtin exists on SFCC.

The recommended lint config supplies the SFCC compatibility layer. When a code version targets an older compatibility mode, an [additional compatibility preset](/packages/eslint-config-sfcc/#older-compatibility-modes) adds the relevant restrictions.

General-purpose lint rules remain valuable too. But advice that is sensible for a modern Node.js application can be wrong for a cartridge. Commerce Klaus can be composed after supported general presets to neutralize recommendations that conflict with the SFCC runtime.

The result should be permission to use supported modern JavaScript, not uncertainty about every modern-looking line.

## Give the new storefront an architecture boundary

Runtime compatibility answers whether code can execute. Architecture policy answers whether that code belongs in this part of the project.

For server-side cartridges in a Storefront Next or PWA setup, the lint configuration can express both from the first commit:

::: code-group

```js [Storefront Next]
import sfcc from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"

export default defineConfig(sfcc.configs.recommended, sfcc.configs["storefront-next"])
```

```js [PWA]
import sfcc from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"

export default defineConfig(sfcc.configs.recommended, sfcc.configs.pwa)
```

:::

The `storefront-next` and `pwa` presets are policy overlays for cartridge code, not restrictions on the storefront's own JavaScript. They reject SFRA controllers and the `server` module, forms, ISML rendering, and Pipeline APIs. They also require explicit named cartridge imports for cross-cartridge dependencies and `~/` for imports within the current cartridge, rather than wildcard `*/` lookup.

That helps the whole team distinguish a relevant backend pattern from an SFRA example that solves a different architectural problem. It does not label SFRA as wrong or obsolete; it says which architecture this new cartridge is intended to support.

If the new storefront shares a repository with existing SFRA or SiteGenesis cartridges, apply the appropriate policy only to the relevant cartridges with [`createStorefrontConfig()`](/packages/eslint-config-sfcc/#restrict-a-preset-to-selected-cartridges). Existing code does not become invalid simply because a newer storefront is introduced alongside it.

## Let project contracts explain the platform

Runtime rules are only part of a good project foundation. Developers also need to understand the shapes of the data and functions they work with.

SFCC stores important contracts outside the JavaScript source:

- Site metadata defines custom and system object attributes.
- Hook registrations connect names to implementation modules.
- Custom API schemas define operation contracts.
- Job step definitions describe parameters and lifecycle functions.

Commerce Klaus's [TypeScript tooling](/packages/typescript-sfcc/) generates project declarations from those inputs and builds on Salesforce's Script API types. Cartridge source remains JavaScript, with JSDoc where an explicit type boundary is useful.

The team does not need to maintain a second handwritten description of every contract merely to get editor feedback. Types can make a configured parameter or attribute discoverable and report mismatches while the implementation is being written.

Linting and typechecking have different jobs: one defines runtime and architecture constraints; the other checks the typed contracts. Neither should be mistaken for the other.

## Keep the local feedback loop honest

A new project should establish a fast local test loop before sandbox-only debugging becomes the norm. The team should not have to abandon modern JavaScript workflows because the production runtime is different.

The [Vitest integration](/packages/vitest-sfcc/) loads real cartridge modules using SFCC-aware resolution and provides focused platform behavior and dependency mocks. It lets tests exercise application logic without turning every local test into a sandbox round trip.

But a local test runtime is not the SFCC platform. It does not certify every JavaScript feature, reproduce every Script API behavior, or prove that a deployment will work. Unknown platform modules must be mocked or supplied through a real-module fallback, not silently treated as working implementations.

Use each feedback layer for what it can establish:

- **Linting:** known runtime incompatibilities and architecture violations.
- **Typechecking:** mismatched Script API and project contracts.
- **Local tests:** application behavior under controlled dependencies.
- **Sandbox validation:** behavior in the actual platform and its integrations.

Run the local checks in CI as well. The boundary should remain the same whether a developer uses the team's preferred editor or only the command line.

## Make the boundary part of the project foundation

A new Storefront Next or PWA project has the advantage of defining these expectations before unsupported patterns, duplicated contracts, and sandbox-only feedback become established practice.

Commerce Klaus cannot remove every SFCC quirk, and it does not make platform knowledge unnecessary. It can turn a useful part of that knowledge into repeatable feedback instead of leaving it as unwritten team folklore.

Developers should be able to bring both modern JavaScript experience and knowledge from earlier SFCC architectures into the new project. They need a clear operating range, not a sequence of surprising failures that teaches them to distrust either background.

Klaus does not replace the Rhino. He helps make its boundaries explicit, so the developer can spend more time solving the commerce problem inside them.

For the complementary perspective on improving an existing codebase, see [Modernize SFCC JavaScript with confidence](/blog/modernize-sfcc-javascript-with-confidence).
