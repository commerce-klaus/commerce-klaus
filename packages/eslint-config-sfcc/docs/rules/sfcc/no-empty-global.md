# sfcc/no-empty-global

Disallows the SFCC-specific `empty(...)` global in JavaScript files. Use explicit checks instead, such as `.length === 0`, `Object.keys(...).length === 0`, or `.isEmpty()`.

## What it checks

- Flags calls to the global `empty(...)`
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`

## Why this rule exists

`empty()` is an SFCC-specific global, not standard JavaScript. It can be confusing when code is meant to read like normal JavaScript, and explicit checks are easier to understand for the underlying type.

## Default behavior

- Severity: `error`
- Auto-fix: none
- Suggestions: yes

## Examples

```js
// bad
if (empty(productIds)) {
  return
}
```

```js
// good
if (productIds.length === 0) {
  return
}
```

```js
// good
if (Object.keys(product).length === 0) {
  return
}
```

```js
// good
if (collection.isEmpty()) {
  return
}
```
