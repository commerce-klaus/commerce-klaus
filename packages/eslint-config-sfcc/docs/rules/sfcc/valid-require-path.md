# sfcc/valid-require-path

Validates SFCC-compatible `require()` paths and optionally checks whether cartridge-style references exist on disk.

## What it checks

- Accepts `dw/*`, `./*`, `../*`, `*/*`, `~/*`, cartridge-style paths like `cartridgeName/module`, and configured bare modules
- Reports invalid require strings that do not match those patterns
- Can verify cartridge existence when `checkCartridgeExists` is enabled
- Can resolve `*/` references against the configured cartridge order or filesystem cartridges
- Can resolve `~/` references against the current cartridge

## Shared settings

This rule reads its shared configuration from `settings.sfcc`.

Relevant options include:

- `allowBareModules`
- `checkCartridgeExists`
- `cartridgesDir`
- `cartridgePath`
- `siteTemplatePath`
- `site`

## Why this rule exists

SFCC projects often mix cartridge-relative imports, template-path lookups, and legacy require conventions. This rule keeps those paths consistent and catches typos before they become runtime failures.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```js
// bad
const helper = require("helpers")
```

```js
// good
const helper = require("*/cartridge/scripts/helpers")
```
