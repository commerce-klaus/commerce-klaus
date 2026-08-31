# sfcc/no-rhino-extensions

Disallows Rhino-specific runtime globals in code intended to stay close to standard JavaScript.

This rule is opt-in and is not part of the recommended config. Existing SFCC projects may depend on Rhino integration APIs and can adopt the rule incrementally.

## What it checks

- Reports the Rhino globals `Iterator` and `StopIteration`
- Reports the LiveConnect globals `JavaAdapter`, `JavaImporter`, `Packages`, `java`, and `javax`
- Ignores parameters, variables, and imports that locally define the same names

Nonstandard syntax such as Rhino's `for each` cannot be reported by an AST rule because standard JavaScript parsers reject it before ESLint rules run. Such syntax still fails linting with a parser error. E4X-like syntax and Rhino import globals are covered separately by `sfcc/no-e4x-syntax` and `sfcc/no-rhino-import-globals`.

## Options

The optional `allow` array names globals that remain available during migration.

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/no-rhino-extensions": ["error", { allow: ["Iterator"] }],
  },
}
```

## Default behavior

- Severity: off (opt-in)
- Allowed Rhino globals: none
- Auto-fix: none

## Examples

```js [Invalid]
const list = new Packages.java.util.ArrayList() // [!code error]
const iterator = Iterator(values) // [!code error]
```

```js [Valid]
const values = ["one", "two"]
for (const value of values) {
  process(value)
}
```
