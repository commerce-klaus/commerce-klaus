# sfcc/no-forms

Disallows SFCC and SFRA form APIs.

This rule is opt-in and is not part of the recommended config. It is enabled by the PWA and Storefront Next architecture presets.

## What it checks

- Reports static access to the `dw/web/Form*` module family, including `Form`, `Forms`, `FormElement`, and `FormField`
- Reports `server.forms` when `server` resolves to a binding imported from the bare SFRA `server` module
- Supports aliased and computed access such as `router["forms"]`
- Ignores unrelated objects with a `forms` property and locally shadowed `server` variables
- Ignores dynamic module paths because their target cannot be determined statically

Form definition XML files are outside ESLint's JavaScript scope. This rule prevents JavaScript form dependencies but does not report XML definitions stored below `cartridge/forms/`.

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Examples

```js [Invalid]
const server = require("server")
const profileForm = server.forms.getForm("profile") // [!code error]

module.exports = profileForm
```

```js [Invalid]
const FormElement = require("dw/web/FormElement") // [!code error]

module.exports = FormElement
```
