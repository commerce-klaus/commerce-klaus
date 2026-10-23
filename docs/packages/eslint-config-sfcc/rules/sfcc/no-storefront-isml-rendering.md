# sfcc/no-storefront-isml-rendering

Disallows rendering ISML through an SFRA storefront response.

This rule is opt-in and is not part of the recommended config. It is enabled by the PWA and Storefront Next architecture presets.

## What it checks

- Reports `res.render(...)` when `res` is the response parameter of a handler registered through an imported SFRA `server` binding
- Supports aliased `server` and response bindings
- Ignores unrelated objects with a `render()` method and locally shadowed `server` variables
- Does not report `dw/template/ISML` or `dw/util/Template`, so cartridges can still render email, XML, and other non-storefront templates

Use [`sfcc/no-template-rendering`](./no-template-rendering.md) as well when all template rendering is prohibited.

## Default behavior

- ⚪ **Severity:** off by default; error in the `pwa` and `storefront-next` presets
- ➖ **Auto-fix:** none

## Example

```js [Invalid]
const server = require("server")

server.get("Home", function (req, res, next) {
  res.render("home/homepage") // [!code error]
  next()
})
```

```js [Valid]
const Template = require("dw/util/Template")

function renderEmail(model) {
  return new Template("mail/order").render(model)
}
```
