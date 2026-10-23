---
layout: home

hero:
  name: "Commerce\u00a0Klaus"
  text: 'Tame the SFCC Rhino<sup><a href="#sfcc-rhino-note" aria-label="Footnote 1: why Rhino?">1</a></sup>'
  tagline: "Pragmatic bridges between Salesforce\u00a0Commerce\u00a0Cloud and the modern JavaScript toolchain."
  image:
    src: https://avatars.githubusercontent.com/u/294446121?s=480&v=4
    alt: "Commerce\u00a0Klaus logo"
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Explore packages
      link: /packages/

features:
  - icon: ✓
    title: Catch platform pitfalls early
    details: ESLint rules catch SFCC script runtime incompatibilities and platform-specific mistakes before code reaches a sandbox.
    link: /packages/eslint-config-sfcc/
    linkText: Explore linting
  - icon: TS
    title: Bring types to cartridges
    details: TypeScript tooling understands Script API types, custom attributes, hooks, Custom APIs, and cartridge-aware imports.
    link: /packages/typescript-sfcc/
    linkText: Explore types
  - icon: ↗
    title: Resolve modules consistently
    details: Shared resolution semantics connect cartridge paths and super modules to Vite, Vitest, Babel, editors, and CI.
    link: /guide/sfcc-module-resolution
    linkText: Understand resolution
---

## A practical toolchain for a particular runtime

SFCC server-side JavaScript lives between two worlds: the cartridge-based [SFCC script runtime](/guide/sfcc-script-runtime), and a development ecosystem built around TypeScript, ESLint, Vite, and fast local feedback. Commerce Klaus makes those worlds work together without pretending their differences do not exist.

[Read the philosophy →](/about/philosophy)

<small id="sfcc-rhino-note"><sup>1</sup> Rhino is the JavaScript engine underlying the SFCC script runtime. [The slogan is about making that environment easier to work with, not replacing it.](/guide/sfcc-script-runtime#why-tame-the-sfcc-rhino)</small>
