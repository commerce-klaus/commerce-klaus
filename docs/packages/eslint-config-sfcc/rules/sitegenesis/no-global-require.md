# sitegenesis/no-global-require

Disallows top-level `require()` calls in SiteGenesis controller files when not every route function uses the same dependency.

## What it checks

- Applies only to files under `cartridge/controllers/`
- Counts top-level route functions, not nested helpers or callbacks
- Reports global `require` bindings that are used in fewer route functions than the file contains

## Why this rule exists

SiteGenesis controllers are easier to reason about when route-specific dependencies live inside the route functions that use them. That prevents shared global `require` declarations from leaking into routes that do not need them.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```js
// bad
var server = require("server")
var someHelper = require("*/cartridge/scripts/helper")

server.get("Show", function (req, res, next) {
  someHelper.doSomething()
  next()
})
```

```js
// good
var server = require("server")

server.get("Show", function (req, res, next) {
  var someHelper = require("*/cartridge/scripts/helper")
  someHelper.doSomething()
  next()
})
```
