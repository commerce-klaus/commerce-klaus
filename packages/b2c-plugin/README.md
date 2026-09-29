[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url]

# @commerce-klaus/b2c-plugin

Commerce Klaus commands for the
[Salesforce B2C CLI](https://salesforcecommercecloud.github.io/b2c-developer-tooling/).

`@commerce-klaus/typescript-sfcc` is a peer dependency so the editor plugin and
B2C CLI commands use the same project-level version.

All project and type commands discover `commerce-klaus.config.ts` or
`commerce-klaus.config.js`. Explicit command flags override the shared values
for one invocation.

## Install

```bash [pnpm]
pnpm add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [yarn]
yarn add -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [npm]
npm install -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

```bash [Vite+]
vp install -D @commerce-klaus/b2c-plugin @commerce-klaus/typescript-sfcc @salesforce/b2c-cli typescript
```

Register the project-local plugin after dependency installation:

```json
{
  "scripts": {
    "prepare": "b2c plugins link node_modules/@commerce-klaus/b2c-plugin --no-install"
  }
}
```

Run the `prepare` script to refresh the link after changing the plugin locally:

```bash [pnpm]
pnpm run prepare
```

```bash [yarn]
yarn run prepare
```

```bash [npm]
npm run prepare
```

```bash [Vite+]
vp run prepare
```

## Quick start

```bash
b2c klaus types sync
b2c klaus types check
b2c klaus inspect
b2c klaus validate
```

Commerce Klaus also provides commands for generated type status and cleanup,
project graphs and impact analysis, module resolution explanations, and project
diagnostics. Run `b2c klaus --help` or a subcommand with `--help` for the local
command reference.

## Documentation

See the [complete command and configuration reference](https://commerce-klaus.github.io/commerce-klaus/packages/b2c-plugin/).

## License

MIT

[npm-url]: https://www.npmjs.com/package/@commerce-klaus/b2c-plugin
[npm-image]: https://badgen.net/npm/v/@commerce-klaus/b2c-plugin
[npm-downloads-image]: https://badgen.net/npm/dw/@commerce-klaus/b2c-plugin
