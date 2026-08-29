# Choosing a package

Commerce Klaus packages are designed to work independently and share SFCC semantics where they overlap.

| Goal                                                             | Package                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Detect Rhino-incompatible JavaScript and invalid SFCC patterns   | [`@commerce-klaus/eslint-config-sfcc`](/packages/eslint-config-sfcc/)               |
| Resolve cartridge modules in the editor and typecheck JavaScript | [`@commerce-klaus/typescript-sfcc`](/packages/typescript-sfcc/)                     |
| Run SFCC server-side modules in Vite or Vitest                   | [`@commerce-klaus/vite-plugin-sfcc-modules`](/packages/vite-plugin-sfcc-modules/)   |
| Run SFCC server-side modules in Babel-based tooling              | [`@commerce-klaus/babel-plugin-sfcc-modules`](/packages/babel-plugin-sfcc-modules/) |
| Build another SFCC-aware tool on the shared resolution core      | [`@commerce-klaus/sfcc-module-resolver`](/packages/sfcc-module-resolver/)           |

## A sensible adoption path

1. Add the ESLint config to detect runtime compatibility problems with little project restructuring.
2. Add the TypeScript tooling for editor feedback, CI typechecks, and generated project-specific declarations.
3. Add either the Vite or Babel adapter when local tests need to load cartridge modules.

The Vite and Babel plugins are alternatives at the transformation layer. Projects can keep both during a migration, but an individual test pipeline normally needs only one.
