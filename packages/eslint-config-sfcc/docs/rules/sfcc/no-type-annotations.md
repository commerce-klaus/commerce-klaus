# sfcc/no-type-annotations

Disallows inline type-annotation syntax in JavaScript files. Use JSDoc types instead.

## What it checks

- Flags `TSTypeAnnotation` nodes in JavaScript-like files
- Applies only to `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`

## Fix behavior

- Simple declarations and function annotations can be auto-fixed by removing the inline annotation
- The rule can suggest JSDoc replacements for variable declarations and function return types when no JSDoc already exists
- Some cases are intentionally left for manual migration, such as `foo?: Type`, `foo!: Type`, and `this: Type`

## Why this rule exists

Rhino and E4X-era parsers may tolerate syntax that is invalid in standard JavaScript. This rule keeps `.js` files aligned with normal JavaScript syntax and nudges type information into JSDoc.

## Default behavior

- Severity: `error`
- Auto-fix: yes, where safe
- Suggestions: yes

## Example

```js
// bad
const count: number = 1
function load(user: User): Result {
  return getResult(user)
}
```

```js
// good
/** @type {number} */
const count = 1

/** @returns {Result} */
function load(user) {
  return getResult(user)
}
```
