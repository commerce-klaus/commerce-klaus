# sfcc/no-rhino-import-globals

Disallows the legacy Rhino globals `importScript(...)`, `importPackage(...)`, and `importClass(...)`. Use CommonJS `require()` instead.

## What it checks

- Flags calls to `importScript`, `importPackage`, and `importClass`
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`

## Why this rule exists

Those globals come from older Rhino-based environments. They make code harder to reason about and are not the module style used by this config.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```js [Invalid]
importPackage(java.lang) // [!code error]
```

```js{1} [Valid]
const javaLang = require("dw/system/SomeModule")
```
