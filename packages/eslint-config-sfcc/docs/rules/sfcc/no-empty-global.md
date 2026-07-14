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

## Nullable references

When you know a value is only a nullable object reference, for example `dw.catalog.Product | null`, a null check can be the clearest replacement.

```js
// before
if (empty(product)) {
  return
}
```

```js
// valid when `product` is only nullable, not a collection/string/object to inspect
if (!product) {
  return
}
```

The rule may offer this as an additional suggestion for identifiers and member expressions, but it is intentionally not the only recommendation because `empty(...)` is also used for strings, arrays, plain objects, and SFCC collections.

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
