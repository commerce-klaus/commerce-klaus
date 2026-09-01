# sfcc/no-pipeline-api

Disallows the legacy SFCC Pipeline API in JavaScript.

This rule is opt-in and is not part of the recommended config. It is enabled by the SFRA, PWA, and Storefront Next architecture presets.

## What it checks

- Reports static `require("dw/system/Pipeline")` calls
- Reports static `import("dw/system/Pipeline")` expressions
- Ignores project modules that happen to use a similar name

Pipeline XML files are outside ESLint's JavaScript scope. This rule prevents JavaScript from executing pipelines, but it does not report pipeline definitions stored in the repository.

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Example

```js [Invalid]
const Pipeline = require("dw/system/Pipeline") // [!code error]

module.exports = function executeLegacyFlow() {
  return Pipeline.execute("Legacy-Start")
}
```
