# sfcc/prefer-native-collections

Prefers standard JavaScript collections over explicitly imported SFCC collection implementations.

This rule is opt-in and is not part of the recommended config. It does not reject collection interfaces returned by platform APIs.

## What it checks

- Reports `dw/util/ArrayList` and recommends `Array`
- Reports `dw/util/HashMap` and recommends `Map`
- Reports `dw/util/HashSet` and `dw/util/LinkedHashSet` and recommends `Set`
- Supports static string and template literal `require(...)` paths
- Ignores `dw/util/Collection`, `dw/util/Iterator`, dynamic paths, and platform API return values

## Options

The optional `allow` array accepts complete module paths for implementations that remain necessary.

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/prefer-native-collections": ["error", { allow: ["dw/util/LinkedHashSet"] }],
  },
}
```

## Why this rule exists

Native collections reduce direct platform coupling and work with standard JavaScript APIs and tooling. SFCC collection interfaces remain valid at platform boundaries where converting a returned value would add work without improving the design.

## Default behavior

- Severity: off (opt-in)
- Allowed SFCC collection implementations: none
- Auto-fix: none

## Examples

```js [Invalid]
const ArrayList = require("dw/util/ArrayList") // [!code error]
const values = new ArrayList()
```

```js [Valid]
const values = []
const indexedValues = new Map()
const uniqueValues = new Set()
```
