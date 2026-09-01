# sfcc/no-isml-rendering

Disallows server-side ISML and template rendering.

This rule is opt-in and is not part of the recommended config. It is enabled by the PWA and Storefront Next architecture presets.

## What it checks

- Reports static access to `dw/template/ISML` and `dw/util/Template`
- Reports `res.render(...)` when `res` is the response parameter of a handler registered through an imported SFRA `server` binding
- Supports aliased `server` and response bindings
- Ignores unrelated objects with a `render()` method and locally shadowed `server` variables

ISML files themselves are outside ESLint's JavaScript scope. This rule prevents JavaScript rendering dependencies but does not report template files stored in the repository.

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Examples

```js [Invalid]
const server = require("server")

server.get("Home", function (req, res, next) {
  res.render("home/homepage") // [!code error]
  next()
})
```

```js [Invalid]
const ISML = require("dw/template/ISML") // [!code error]

ISML.renderTemplate("mail/order", model)
```
