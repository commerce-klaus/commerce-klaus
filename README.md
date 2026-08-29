# Commerce Klaus

Pragmatic developer tooling for Salesforce Commerce Cloud (SFCC). Commerce Klaus brings cartridge-aware resolution, runtime compatibility checks, and type information into modern JavaScript workflows.

## Packages

| Package                                                                                                                | Purpose                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`@commerce-klaus/eslint-config-sfcc`](https://www.npmjs.com/package/@commerce-klaus/eslint-config-sfcc)               | ESLint rules for SFCC and Rhino compatibility                  |
| [`@commerce-klaus/typescript-sfcc`](https://www.npmjs.com/package/@commerce-klaus/typescript-sfcc)                     | Cartridge-aware TypeScript tooling and generated project types |
| [`@commerce-klaus/vite-plugin-sfcc-modules`](https://www.npmjs.com/package/@commerce-klaus/vite-plugin-sfcc-modules)   | SFCC module resolution for Vite and Vitest                     |
| [`@commerce-klaus/babel-plugin-sfcc-modules`](https://www.npmjs.com/package/@commerce-klaus/babel-plugin-sfcc-modules) | SFCC module resolution for Babel-based tooling                 |
| [`@commerce-klaus/sfcc-module-resolver`](https://www.npmjs.com/package/@commerce-klaus/sfcc-module-resolver)           | Shared cartridge and module resolution utilities               |

## Documentation

Guides, package references, ESLint rule documentation, and the ideas behind the project are available at:

**[commerce-klaus.github.io/commerce-klaus](https://commerce-klaus.github.io/commerce-klaus/)**

## Development

This monorepo uses [Vite+](https://viteplus.dev/) and pnpm workspaces. Node.js 22.12 or newer is required.

```bash
vp install
vp run ready
```

Start the documentation site locally with:

```bash
vp run docs:dev
```

User-facing changes require a Changeset:

```bash
vp run changeset
```

## Contributing

Contributions are welcome. Open an issue to discuss bugs or larger changes, and include tests and a Changeset with release-relevant pull requests.

## License

[MIT](LICENSE)
