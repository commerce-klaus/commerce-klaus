# SFCC Dev Tooling Monorepo

Tooling packages for Salesforce Commerce Cloud (SFCC) projects, maintained in a single monorepo.

This repository contains reusable developer tooling for cartridge-based projects:

- TypeScript support for SFCC cartridges
- ESLint config presets for SFCC and SiteGenesis codebases
- Module path resolution plugins for Babel and Vite

The monorepo is powered by Vite+ and pnpm workspaces.

## What Is Included

### Packages

- `packages/sfcc-ts-tooling`
  - TypeScript tooling for SFCC cartridge projects
  - Includes a TS server plugin and a CLI typecheck command
- `packages/eslint-config-sfcc`
  - Shareable ESLint configurations for SFCC projects
  - Includes SFCC- and SiteGenesis-related rule sets
- `packages/babel-plugin-sfcc-modules`
  - Babel plugin for SFCC-specific import/require path behavior
- `packages/vite-plugin-sfcc-modules`
  - Vite plugin for SFCC-specific module path handling

### Example / Fixture Content

- `cartridges/app_sfra/cartridge/controllers`
  - Sample cartridge structure used for development and validation

## Requirements

- Node.js `>=22.12.0`
- pnpm `11.x`
- Vite+ (`vp`) available in your environment

## Getting Started

1. Install dependencies:

   ```bash
   vp install
   ```

2. Run the full repository check (lint, tests, build):

   ```bash
   vp run ready
   ```

## Common Commands

Run these from the repository root.

- Check formatting/linting/type checks:

  ```bash
  vp check
  ```

- Run tests in all workspace packages:

  ```bash
  vp run -r test
  ```

- Build all packages:

  ```bash
  vp run -r build
  ```

- Run full ready pipeline (check + test + build):

  ```bash
  vp run ready
  ```

## Working On A Single Package

Change into a package and use its local scripts.

Example:

```bash
cd packages/eslint-config-sfcc
vp check
vp test
vp pack
```

Most packages expose:

- `build` -> `vp pack`
- `check` -> `vp check`
- `test` -> `vp test`

## Repository Layout

```text
.
|- cartridges/
|  |- app_sfra/
|- packages/
|  |- babel-plugin-sfcc-modules/
|  |- eslint-config-sfcc/
|  |- sfcc-ts-tooling/
|  \- vite-plugin-sfcc-modules/
|- vite.config.ts
\- pnpm-workspace.yaml
```

## Release And Publishing Notes

- Packages are configured as publishable npm packages.
- Each package uses `prepublishOnly` to run a build before publishing.
- Publish config is set to public where applicable.

## Contributing

1. Create a branch for your change.
2. Implement and test your changes.
3. Run:

   ```bash
   vp check
   vp run -r test
   vp run -r build
   ```

4. Open a pull request with a clear summary and test notes.

## Troubleshooting

- If environment setup looks wrong:

  ```bash
  vp env doctor
  ```

- If commands fail after dependency updates, run:

  ```bash
  vp install
  ```
