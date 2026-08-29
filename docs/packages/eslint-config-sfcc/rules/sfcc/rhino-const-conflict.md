# sfcc/rhino-const-conflict

Detects repeated `const` declarations in nested blocks of the same function when the identifier name is reused. Rhino treats those bindings as function-scoped and would raise a redeclaration error.

## What it checks

- Tracks `const` declarations per function
- Only reports nested-block declarations when the same name is declared as `const` elsewhere in the same function

## Fix behavior

- Rewrites the conflicting nested `const` declarations to `let`

## Why this rule exists

This is a Rhino-specific safeguard. A pattern that is legal in modern JavaScript can still fail on SFCC when nested blocks reuse the same `const` name.

## Default behavior

- Severity: `error`
- Auto-fix: yes

## Example

```js
// bad
if (flagA) {
  const temp = 1
}

if (flagB) {
  const temp = 2
}
```

```js
// good
if (flagA) {
  let temp = 1
}

if (flagB) {
  let temp = 2
}
```
