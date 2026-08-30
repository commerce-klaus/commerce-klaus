---
layout: home

hero:
  name: "Commerce\u00a0Klaus"
  text: Tame the SFCC Rhino.
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
    details: ESLint rules encode the parts of Rhino and SFCC that differ from modern JavaScript before code reaches a sandbox.
  - icon: TS
    title: Bring types to cartridges
    details: TypeScript tooling understands Script API types, custom attributes, hooks, Custom APIs, and cartridge-aware imports.
  - icon: ↗
    title: Resolve modules consistently
    details: Shared resolution semantics connect cartridge paths and super modules to Vite, Vitest, Babel, editors, and CI.
---

## A practical toolchain for a particular runtime

SFCC server-side JavaScript lives between two worlds: a cartridge-based platform with Rhino-specific behavior, and a development ecosystem built around TypeScript, ESLint, Vite, and fast local feedback. Commerce Klaus makes those worlds work together without pretending their differences do not exist.

[Read the philosophy →](/about/philosophy)
