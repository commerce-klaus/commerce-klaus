# sfcc/no-empty-global

Disallows every call to the SFCC-specific global `empty(...)`.

## Why this rule exists

`empty()` is an SFCC extension rather than standard JavaScript. It combines checks for `null`, `undefined`, empty strings, empty arrays, and empty SFCC collections in one operation. That broad behavior can hide the condition a caller actually intends.

Use this rule when a project wants to remove `empty()` completely and require explicit JavaScript checks.

## Default behavior

- Severity: Off
- Auto-fix: none
- Suggestions: one behavior-preserving replacement when the argument type is known

The recommended config instead enables:

- [`sfcc/prefer-explicit-empty-check`](./prefer-explicit-empty-check.md) for values that can be migrated safely
- [`sfcc/no-ambiguous-empty`](./no-ambiguous-empty.md) for values that need better type information first

## Strict project policy

Apply this configuration after the recommended config to ban `empty()` without duplicate migration diagnostics:

```js
import sfcc from "@commerce-klaus/eslint-config-sfcc"

export default [
  ...sfcc.configs.recommended,
  {
    rules: {
      "sfcc/no-ambiguous-empty": "off",
      "sfcc/prefer-explicit-empty-check": "off",
      "sfcc/no-empty-global": "error",
    },
  },
]
```

## Example

```js [Invalid]
if (empty(productIds)) {
  return
}
```

```js [Valid]
if (productIds === null || productIds === undefined || productIds.length === 0) {
  return
}
```
