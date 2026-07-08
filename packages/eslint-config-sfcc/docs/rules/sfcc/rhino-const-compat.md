# sfcc/rhino-const-compat

Enforces `let` instead of `const` in Rhino-unsafe loop-related scopes.

## What it checks

- Flags `const` declarations in Rhino-critical scopes
- Targets loop headers and declarations inside loop bodies where Rhino compatibility is a concern

## Fix behavior

- Automatically rewrites the keyword from `const` to `let`

## Why this rule exists

Rhino does not handle `const` reliably in some loop-related contexts. This rule keeps the code valid in those places and prevents the fixers from producing code that works in modern JavaScript but not on SFCC sandboxes.

## Default behavior

- Severity: `error`
- Auto-fix: yes

## Example

```js
// bad
for (const item of items) {
  process(item)
}
```

```js
// good
for (let item of items) {
  process(item)
}
```
