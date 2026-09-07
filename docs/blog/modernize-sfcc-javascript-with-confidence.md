---
description: How established SFCC JavaScript can adopt modern syntax, stronger linting, and generated type contracts with confidence.
date: 2026-09-06
author: Jens Simon
---

# Modernize SFCC JavaScript with confidence

September 6, 2026 · Jens Simon

Some Salesforce Commerce Cloud codebases have been running for more than a decade. They have seen SiteGenesis pipelines, controllers, multiple integration generations, changing storefront architectures, and years of urgent production work.

That history is not automatically technical debt. Much of the code encodes behavior that has survived real traffic, real promotions, real order flows, and real operational incidents. But proven business behavior does not require preserving every old JavaScript pattern around it.

Established SFCC code can and should be modernized. The challenge is to do it with clear evidence about what the platform supports and with feedback strong enough to keep each change safe.

The practical question is how to improve syntax, structure, and contracts without losing the production knowledge already captured in the code.

New projects benefit from the same approach. They can start with the compatibility rules, generated contracts, editor diagnostics, and test runtime already in place, preventing unsupported patterns and duplicated type definitions from becoming part of the codebase in the first place.

## TL;DR

- Use modern JavaScript in cartridges, with ESLint or Oxlint enforcing the boundaries of the SFCC runtime.
- Typecheck the deployed JavaScript directly with JSDoc, the TypeScript language-service plugin, and declarations generated from existing SFCC metadata.
- Test real cartridge modules with `@commerce-klaus/vitest-sfcc`, controlled platform behavior, and dependency mocks instead of `proxyquire`.
- Run the same lint, type, and test guarantees in CI, then let Renovate or Dependabot keep the toolchain current through validated pull requests.
- Apply the workflow incrementally to established codebases or make it the baseline of a new project from the first commit.

## Feedback before the sandbox

A traditional SFCC feedback loop is expensive:

1. Change cartridge code.
2. Upload it to a sandbox.
3. Exercise the affected route or job.
4. Find a syntax, module-resolution, or data-shape error.
5. Search logs and repeat.

The later an error appears, the more context is required to understand it. A diagnostic in the editor points at the changed expression. A sandbox error may surface through a controller, a scheduled job, an integration response, or a production log long after the original edit.

Static tooling shortens that loop. It does not replace sandbox tests or production observability. It removes failures that never needed a sandbox to begin with.

## Linting as a compatibility contract

ESLint is often introduced as a style tool. In an SFCC project, it can do more important work.

A useful SFCC configuration answers runtime questions:

- Is this syntax supported by the target Rhino environment?
- Is this standard-library method available?
- Is the cartridge import valid?
- Does a Custom API export the configured function and mark it as public?
- Does a registered hook module expose the required function?
- Is legacy platform-specific syntax hiding a standard JavaScript alternative?

Many findings are mechanical and safely autofixable. That makes lint-driven modernization suitable for an established codebase: CI can enforce a baseline, developers can repair violations in small changes, and the repository improves continuously rather than waiting for a single large migration.

The goal is not to force old code into ES5 forever. Modern JavaScript should be used where SFCC supports it. Commerce Klaus treats features such as `const`, `let`, destructuring, template literals, `for...of`, and generators as part of the verified baseline while reporting known runtime gaps.

### Combine broad JavaScript guidance with SFCC knowledge

Commerce Klaus is not a replacement for the wider ESLint ecosystem. General-purpose presets are valuable precisely because they find issues and modernization opportunities that are not specific to commerce.

Start with ESLint Recommended for fundamental correctness checks. Add `eslint-plugin-unicorn` for a broader set of modern JavaScript practices and autofixable improvements. Then apply the Commerce Klaus recommended config as the SFCC-aware compatibility layer:

```js [eslint.config.js]
import js from "@eslint/js"
import sfcc from "@commerce-klaus/eslint-config-sfcc"
import { defineConfig } from "eslint/config"
import unicorn from "eslint-plugin-unicorn"

export default defineConfig(
  js.configs.recommended,
  unicorn.configs.recommended,
  sfcc.configs.recommended,
)
```

This is a focused starting point, not the limit of the composition model. Commerce Klaus also maintains compatibility with the recommended configs from `typescript-eslint` and `eslint-plugin-sonarjs`. Teams can place those presets before the SFCC config in the same way and retain their broader analysis.

Ordering matters. The SFCC config comes after the general presets so it can disable recommendations that would introduce unsupported syntax, APIs, or module conventions. For example, it neutralizes incompatible core preferences such as object spread and selected Unicorn recommendations such as `Array.prototype.at()`, ESM conversion, `String.prototype.replaceAll()`, and spread-based rewrites.

The same principle applies to other supported presets: Commerce Klaus disables `@typescript-eslint/no-require-imports` because cartridge code uses CommonJS and `sonarjs/no-implicit-global` because its assumptions conflict with the SFCC module environment. It does not enable those third-party presets itself. Their remaining rules still do useful work alongside ESLint Recommended and Unicorn, while Commerce Klaus contributes platform-specific validation and defines where otherwise sensible advice crosses the SFCC runtime boundary.

This combination makes modernization more ambitious, not less. Developers can apply strong contemporary defaults without guessing which suggestions are safe in a cartridge.

Teams that prioritize lint speed can run the supported Commerce Klaus rules through Oxlint's JavaScript plugin API. A minimal ESLint follow-up covers the three syntax-oriented rules that Oxlint cannot execute, preserving the SFCC compatibility boundary without duplicating the full lint pass. The [ESLint package guide](/packages/eslint-config-sfcc/#use-with-oxlint) documents both configurations.

For example, a small generator can turn SFCC's `SeekableIterator` into a standard JavaScript iterable while still closing the platform resource reliably:

```js
const ProductMgr = require("dw/catalog/ProductMgr")

function* allSiteProducts() {
  const products = ProductMgr.queryAllSiteProducts()

  try {
    while (products.hasNext()) {
      yield products.next()
    }
  } finally {
    products.close()
  }
}

for (const product of allSiteProducts()) {
  processProduct(product)
}
```

Here, `const`, a generator, `for...of`, and `try...finally` make the lifecycle easier to see without hiding the SFCC API. The important part is not merely that the syntax looks modern. The executable compatibility policy establishes that these features are supported, so developers do not need to rely on memory or folklore.

## Type checking without transforming cartridge code

Writing server-side SFCC cartridges in `.ts` files requires transpilation. That creates two representations of the program: developers edit TypeScript, while the sandbox executes generated JavaScript.

SFCC does not provide source-map support for server-side cartridge code. Production stack traces therefore point into generated JavaScript rather than the TypeScript developers wrote. Line numbers, expressions, and even control flow can differ, making incidents unnecessarily difficult to trace back to their source. Without a reliable mapping between both representations, using `.ts` as the authored cartridge language is not a practical tradeoff.

JavaScript with JSDoc provides the useful parts of TypeScript without that disconnect. Current TypeScript versions can check JavaScript rigorously while the exact source reviewed by developers is also uploaded, executed, and referenced by sandbox stack traces:

```js
/**
 * @param {dw.order.Order} order
 * @returns {string}
 */
function getOrderReference(order) {
  return order.orderNo
}
```

This is valuable even when adopted gradually. A module does not need to be converted before its first useful diagnostic appears. One annotated boundary can improve completion and checking throughout the code that follows from it.

The same functionality is available while developers edit the code. The TypeScript language-service plugin can be enabled directly in the cartridge project's `jsconfig.json`:

```json [cartridges/jsconfig.json]
{
  "compilerOptions": {
    "plugins": [{ "name": "@commerce-klaus/typescript-sfcc" }]
  }
}
```

The IDE can then resolve SFCC-specific imports such as `*/`, `~/`, cartridge aliases, and `module.superModule`, and use the generated project declarations for completion, navigation, and diagnostics. The editor and `sfcc-ts-typecheck` consume the same generated type information, so developers see most contract violations at the expression they are writing rather than discovering them only when CI runs.

The weakness of handwritten JSDoc is duplication. If a parameter is defined in metadata and repeated in a comment, the two definitions can drift apart. Generated declarations change that equation.

## Generate types from contracts you already maintain

SFCC projects already contain structured contracts:

- site metadata defines custom and system object attributes
- `steptypes.json` defines job step parameters and lifecycle functions
- Custom API schemas define operations, request bodies, and responses
- Salesforce Script API declarations define platform hook signatures

Those files should be sources of type information rather than documentation developers must manually repeat.

### Custom attributes

When metadata declares an attribute, generated declarations make it available directly on the corresponding Script API object:

```js
const ProductMgr = require("dw/catalog/ProductMgr")

const product = ProductMgr.getProduct(productId)
if (product) {
  const isGiftWrappable = product.custom.isGiftWrappable
  const warrantyPeriodMonths = product.custom.warrantyPeriodMonths
}
```

The editor infers `isGiftWrappable` as `boolean` and `warrantyPeriodMonths` as `number` directly from the metadata. It can likewise preserve date and enum value types, complete known attributes, and report misspelled or unknown names. No local typedef is necessary.

This catches a particularly common class of SFCC mistakes: code and imported site metadata disagreeing about an attribute name or value type.

### Job steps

A Job Step implementation traditionally repeats its metadata contract in JSDoc, often incompletely:

```js
/**
 * @param {Object} parameters
 * @returns {dw.system.Status}
 */
function execute(parameters) {
  // Which fields exist? Which are numbers? Which are optional?
}
```

A generated function contract reduces that to one annotation:

```js
/** @type {SfccJobSteps.Definitions["custom.ExportCatalog"]["Functions"]["execute"]} */
const execute = function (parameters, stepExecution) {
  const targetFolder = parameters.TargetFolder
  const batchSize = parameters.BatchSize
  const jobId = stepExecution.getJobExecution().getJobID()
  // ...
}
```

The type comes from `steptypes.json`. Required fields, defaults, enums, converted numbers and dates, status codes, and the `JobStepExecution` argument stay connected to the registration that SFCC actually uses.

This can expose metadata defects as well as code defects. If a value is declared as a string but the implementation compares it numerically, the correct fix may be in `steptypes.json`, not a cast in JavaScript.

### Custom APIs

Custom APIs have the same opportunity. The operation and its OAS schema already describe the boundary:

```js
/** @type {SfccCustomApis.Operations["setFavoriteStore"]["Handler"]} */
const setFavoriteStore = function () {
  /** @type {SfccCustomApis.Operations["setFavoriteStore"]["RequestBody"]} */
  const payload = JSON.parse(request.httpParameterMap.requestBodyAsString)

  // payload is checked against the API schema
  updateFavoriteStore(payload.favoriteStoreId)
}

setFavoriteStore.public = true
exports.setFavoriteStore = setFavoriteStore
```

The handler contract checks the callable export and its SFCC `public` marker. Generated `RequestBody`, `Parameters`, and `Response` types let the implementation reuse the OAS contract instead of maintaining a parallel set of local object shapes.

### Platform hooks

Salesforce hook declarations can type the entire implementation in the same way:

```js
/** @type {SfccHooks.OrderCalculateShipping} */
const calculateShipping = function (lineItemCtnr) {
  ShippingMgr.applyShippingCost(lineItemCtnr)
  return new Status(Status.OK)
}
```

A single annotation checks parameters and return type against the Script API definition. Project-specific hooks and Shopper API document extensions can use narrow declarations in a local `sfcc-hooks.d.ts` until an authoritative machine-readable contract exists.

## Generated types are executable documentation

Generated declarations do more than improve editor completion. They connect configuration and implementation.

A handwritten comment can become stale without anyone noticing. A generated type participates in CI. When metadata changes, the next typecheck shows which assumptions no longer hold.

That creates a useful sequence of safeguards:

1. ESLint checks whether the JavaScript and module patterns are valid for SFCC.
2. TypeScript checks platform APIs and project-specific contracts without transforming the source.
3. Generated declarations keep metadata-driven boundaries synchronized.
4. Tests exercise behavior with cartridge resolution and deterministic platform substitutes.
5. Sandbox validation remains focused on behavior that genuinely requires the platform.

Each layer catches a different category of failure. None needs to pretend that SFCC is Node.js, and none requires replacing the storefront architecture first.

## Unit-test behavior inside an SFCC-aware runtime

Linting and type checking establish that a modernization is compatible and internally consistent. Unit tests add the missing behavioral evidence: the code still produces the expected result after the change.

Ordinary Vitest cannot load cartridge modules reliably on its own. SFCC code depends on CommonJS transformation, cartridge-path precedence, identifiers such as `dw/*`, `*/`, and `~/`, `module.superModule`, platform globals, and framework lifecycles. [`@commerce-klaus/vitest-sfcc`](/packages/vitest-sfcc/) brings those semantics into the test process instead of forcing every project to recreate them with unrelated stubs.

```ts [vitest.config.ts]
import sfccVitest from "@commerce-klaus/vitest-sfcc"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: "./cartridges",
      cartridgePath: ["app_custom", "app_storefront_base"],
    }),
  ],
})
```

Tests can then load real cartridge modules while replacing only the platform or integration dependencies relevant to the scenario:

```ts [payment.test.ts]
import { expect, it } from "vitest"
import { resetSfccRuntime } from "@commerce-klaus/vitest-sfcc"

it("rejects a declined authorization", async () => {
  const runtime = resetSfccRuntime()
  runtime.mock("*/cartridge/scripts/payment/provider", {
    authorize: () => ({ authorized: false }),
  })

  const payment = await import("../cartridge/scripts/payment.js")

  expect(payment.default.authorizePayment()).toMatchObject({
    authorized: false,
  })
})
```

This removes the need for `proxyquire` and its module-loading workarounds. Mocks are registered against SFCC module identifiers or exact resolved files before the module under test is imported, while cartridge precedence and the normal transformation pipeline remain active.

The same runtime provides controlled SFCC globals and focused platform modules, resolves real cartridge overrides and super modules, and offers execution harnesses for SFRA controllers, hooks, and metadata-defined job steps. Resetting the runtime between tests keeps globals, mocks, and module state deterministic across Vitest workers.

This does not claim to emulate the complete platform. Unsupported behavior remains explicit and mockable, while the semantics that determine how cartridge code is loaded and invoked stay consistent across tests. Sandbox tests can therefore concentrate on integrations and platform behavior that genuinely require Salesforce infrastructure.

## CI turns gradual improvements into a baseline

The workflow becomes especially effective when CI makes it routine:

```bash
sfcc-ts-sync-types
eslint cartridges
sfcc-ts-typecheck
vitest run
```

The exact commands vary by project, but the order is useful. Generate declarations from the current metadata, lint runtime compatibility and registrations, typecheck the JavaScript, then execute tests.

Dependency automation makes this baseline sustainable. [Renovate](https://docs.renovatebot.com/) or [Dependabot](https://docs.github.com/en/code-security/dependabot) can keep ESLint, Oxlint, TypeScript, Vitest, their recommended configs, and the Commerce Klaus packages current through small, regular pull requests. Each update then runs through the same generated types, compatibility checks, and unit tests as an application change.

The bot does not decide whether a breaking modernization is appropriate. It automates discovery, version changes, and repeatable validation. Teams can group compatible patch and minor updates, require review for majors or behavior-sensitive tools, and enable automerge only when the complete CI pipeline succeeds. This turns toolchain maintenance from an occasional migration project into a controlled part of normal development.

A legacy module can remain largely unchanged until normal feature work touches it. At that point, lint fixes can remove unsupported or ambiguous patterns, and one generated function annotation can establish a typed boundary. The improvement is local, reviewable, and enforced from then on.

In a new project, the same pipeline establishes the baseline from the first commit. Developers can use modern syntax confidently, metadata becomes typed as soon as it is introduced, and every new controller, hook, API, or job step enters a codebase where compatibility and behavior are checked by default.

Over time, the repository accumulates guarantees instead of merely accumulating patches.

## Modernization without amnesia

Long-lived commerce systems contain decisions that are easy to underestimate from a clean architecture diagram. A safe modernization strategy respects that history while refusing to make every future developer rediscover it.

Keep the runtime model. Keep the cartridge code inspectable. Add automated knowledge around it:

- compatibility rules for the JavaScript SFCC can execute
- cartridge-aware module resolution
- Script API types
- declarations generated from project metadata
- focused runtime tests

The result is not TypeScript for its own sake and not a cosmetic modernization campaign. It is modern JavaScript backed by a development environment in which more mistakes are cheap, local, and understandable.

That is the standard worth pursuing: established and newly written SFCC code running inside the same well-defined safety boundary.
