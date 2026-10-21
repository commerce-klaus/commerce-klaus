# sfcc/no-template-rendering

Disallows direct access to SFCC template-rendering modules.

This rule is opt-in and is not part of the recommended config or an architecture preset. Enable it only in cartridges where email, XML, storefront, and other server-side template rendering are all prohibited.

## What it checks

- Reports static `require(...)` and `import(...)` access to `dw/template/ISML`
- Reports static `require(...)` and `import(...)` access to `dw/util/Template`
- Does not report SFRA response rendering; use [`sfcc/no-storefront-isml-rendering`](./no-storefront-isml-rendering.md) for that boundary

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Example

```js [Invalid]
const Template = require("dw/util/Template") // [!code error]

function renderEmail(model) {
  return new Template("mail/order").render(model)
}
```
