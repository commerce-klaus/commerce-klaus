# The Commerce Klaus philosophy

Commerce Klaus builds pragmatic developer tools for Salesforce Commerce Cloud. The project exists to bridge established SFCC conventions with the feedback loops developers expect from the modern JavaScript ecosystem.

## Respect the runtime

SFCC server-side JavaScript is not browser JavaScript and it is not Node.js. Rhino compatibility, CommonJS modules, cartridge precedence, and platform APIs are real constraints. The tooling models those constraints explicitly instead of hiding them behind generic presets.

## Move failures closer to the editor

A sandbox should not be the first place that reveals an unsupported syntax feature, a broken cartridge import, or a missing hook export. Commerce Klaus shifts those failures into ESLint, TypeScript, local test runners, and CI, where they are cheaper to understand and fix.

## Share semantics, not accidental duplication

The packages meet developers in different tools, but they should agree on SFCC behavior. A shared module resolver provides cartridge ordering, module resolution, super-module lookup, and hook registration semantics. ESLint, TypeScript, Vite, and Babel remain focused adapters around that core.

## Prefer incremental adoption

Each package solves a bounded problem. Teams can begin with compatibility linting, add cartridge-aware type checking, and then bring server-side modules into local tests. No framework migration is required.

## Treat recommended configs as a baseline, not a ranking

A rule does not become unimportant because it is opt-in. Recommended configs provide conservative defaults that can be adopted broadly without assuming a team's architecture or migration policy. Opt-in rules are equally intentional: they let teams encode stricter conventions where the right choice depends on project context.

Commerce Klaus makes both kinds of rules available so platform constraints and architectural decisions can be explicit, reviewable, and enforced close to the editor.

## Why “Klaus”?

Klaus is a traditional, down-to-earth German first name. Here it personifies the practical colleague who rolls up his sleeves and deals with the platform quirks that interrupt everyday development.

The name pairs the corporate world of Salesforce Commerce Cloud with a friendly, no-nonsense developer persona:

> Klaus is here to tame the SFCC Rhino.
