# sfcc/no-custom-api-response-methods

Disallows legacy global `response` APIs in [Custom API](https://developer.salesforce.com/docs/commerce/commerce-api/guide/custom-apis.html) implementation scripts.

## What it checks

- Applies only to scripts referenced as an `implementation` by a sibling `api.json`
- Reports direct use of `response.render`, `response.redirect`, `response.setStatus`, `response.setContentType`, `response.getWriter`, and `response.writer`
- Allows `RESTResponseMgr.createSuccess(...).render()` and `RESTResponseMgr.createError(...).render()`

## Why this rule exists

Custom APIs must return JSON. Legacy controller response APIs can produce redirects, templates, or manually written non-JSON responses. Use `dw/system/RESTResponseMgr` so successful and error responses follow the Custom API response contract.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```js [Invalid script.js]
exports.getLoyaltyInfo = function () {
  response.setStatus(404) // [!code error]
  response.getWriter().print("Not found") // [!code error]
}
```

```js{1,4} [Valid script.js]
const RESTResponseMgr = require("dw/system/RESTResponseMgr")

exports.getLoyaltyInfo = function () {
  return RESTResponseMgr.createError(404, "not-found", "Not Found", "Customer not found").render()
}
```
