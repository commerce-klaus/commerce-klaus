# sfcc/no-sfra-server

Disallows the SFRA `server` module and its routing API.

This rule is opt-in and is not part of the recommended config. It is enabled by the PWA, Storefront Next, SiteGenesis Controllers, and SiteGenesis Pipelines architecture presets.

## What it checks

- Reports static `require("server")` calls
- Reports static `import("server")` expressions
- Allows relative project modules such as `require("./server")`

## Why this rule exists

The bare `server` module is specific to SFRA controllers. Disallowing it prevents SFRA routes from leaking into headless or SiteGenesis cartridges and keeps architecture boundaries explicit.

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Example

```js [Invalid]
const server = require("server") // [!code error]

server.get("Home", function (req, res, next) {
  next()
})
```
