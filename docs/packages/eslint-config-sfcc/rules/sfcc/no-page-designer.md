# sfcc/no-page-designer

Disallows Page Designer APIs in cartridges that do not support Page Designer.

This rule is opt-in and is not part of the recommended config or a storefront architecture preset. Page Designer can be integrated with multiple storefront architectures, including headless storefronts, so the package does not infer this policy from the storefront type.

## What it checks

- Reports static `require("dw/experience/*")` calls
- Reports static `import("dw/experience/*")` expressions
- Covers nested namespaces such as `dw/experience/image/*` and `dw/experience/cms/*`
- Ignores modules outside the exact `dw/experience/` namespace
- Ignores dynamic module paths because their target cannot be determined statically

Page Designer component and page metadata files are outside ESLint's JavaScript scope. This rule prevents JavaScript API dependencies but does not report metadata stored in the cartridge.

## Configuration

Apply the rule only to cartridges that must remain independent of Page Designer:

```js [eslint.config.js]
import sfccConfig, { sfcc } from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...sfccConfig.configs.recommended,
  {
    files: ["cartridges/lib_domain/**/*.js", "cartridges/int_backend/**/*.js"],
    plugins: { sfcc },
    rules: {
      "sfcc/no-page-designer": "error",
    },
  },
]
```

## Default behavior

- Severity: off (opt-in)
- Auto-fix: none

## Example

```js [Invalid]
const PageMgr = require("dw/experience/PageMgr") // [!code error]

module.exports = PageMgr
```
