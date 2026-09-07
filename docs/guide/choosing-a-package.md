# Choosing a package

Commerce Klaus packages are designed to work independently and share SFCC semantics where they overlap.

| Goal                                                             | Package                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Detect invalid SFCC patterns with ESLint or Oxlint               | [`@commerce-klaus/eslint-config-sfcc`](/packages/eslint-config-sfcc/)               |
| Resolve cartridge modules in the editor and typecheck JavaScript | [`@commerce-klaus/typescript-sfcc`](/packages/typescript-sfcc/)                     |
| Unit-test SFCC cartridge code with Vitest                        | [`@commerce-klaus/vitest-sfcc`](/packages/vitest-sfcc/)                             |
| Resolve SFCC server-side modules in other Vite-based tools       | [`@commerce-klaus/vite-plugin-sfcc-modules`](/packages/vite-plugin-sfcc-modules/)   |
| Run SFCC server-side modules in Babel-based tooling              | [`@commerce-klaus/babel-plugin-sfcc-modules`](/packages/babel-plugin-sfcc-modules/) |
| Build another SFCC-aware tool on the shared resolution core      | [`@commerce-klaus/sfcc-module-resolver`](/packages/sfcc-module-resolver/)           |

## A sensible adoption path

1. Add the lint config through ESLint or Oxlint to detect runtime compatibility problems with little project restructuring.
2. Add the TypeScript tooling for editor feedback, CI typechecks, and generated project-specific declarations.
3. Add the Vitest integration when unit tests need to execute cartridge modules in an SFCC-aware runtime.
4. Add the Vite or Babel adapter only when another tool needs cartridge transformation without the Vitest runtime.

Do not configure `vitest-sfcc` together with `vite-plugin-sfcc-modules`; the Vitest integration already includes cartridge resolution and transformation. The standalone Vite and Babel plugins remain alternatives for other tooling pipelines.
