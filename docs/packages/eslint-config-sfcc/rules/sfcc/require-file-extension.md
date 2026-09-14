# sfcc/require-file-extension

Requires explicit runtime file extensions in static relative and cartridge module paths.

This rule is not part of the recommended config. It is opt-in because extensionless module paths
are valid on SFCC and widely used in existing projects.

## What it checks

- Checks static `require(...)` and dynamic `import(...)` paths
- Covers relative, `~/`, `*/`, and named cartridge paths
- Accepts the SFCC runtime extensions `.js`, `.ds`, and `.json`
- Ignores `dw/*`, bare modules such as `server`, and dynamic paths
- Resolves modules with the configured cartridge order before offering an automatic fix

## Why this rule exists

Generic extension rules do not understand SFCC cartridge precedence or the meanings of `*/` and
`~/`. This rule uses Commerce Klaus's shared module resolver, so a fix reflects the file that SFCC
would load for the importing cartridge.

## Default behavior

- Severity: off
- Auto-fix: appends the extension when the path resolves directly to one `.js`, `.ds`, or `.json`
  file
- Reports without a fix when the target cannot be resolved or the path resolves through an
  `index.*` file

## Examples

```js [Invalid]
const helper = require("*/cartridge/scripts/helper") // [!code error]
const config = require("~/cartridge/config/settings") // [!code error]
```

```js [Valid]
const helper = require("*/cartridge/scripts/helper.js")
const config = require("~/cartridge/config/settings.json")
const OrderMgr = require("dw/order/OrderMgr")
```

## Configuration

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/require-file-extension": "error",
  },
}
```

The rule uses the [shared SFCC settings](../../index.md#customize-with-shared-sfcc-settings) for
cartridge discovery and precedence. Configure `cartridgesDir`, `cartridgePath`, `siteTemplatePath`,
or `site` there when automatic resolution needs project-specific information.
