# sfcc/prefer-const

Requires `const` for `let` and `var` declarations that are never reassigned, except in Rhino-sensitive scopes where `const` would be unsafe.

## What it checks

- Finds declarations whose variables are never reassigned
- Skips nested blocks, because Rhino can treat nested `const` bindings as conflicting function-scoped bindings
- Skips Rhino-critical scopes, such as loop headers and related declarations handled by `sfcc/rhino-const-compat`

## Fix behavior

- Rewrites eligible `let` and `var` declarations to `const`
- Leaves unsafe scopes alone so `--fix` does not bounce between conflicting rules

## Why this rule exists

The config aims to preserve the safe use of `const` while avoiding patterns that behave differently in Rhino. That keeps the fix flow stable and makes the Rhino-specific rules cooperate instead of fighting each other.

## Default behavior

- Severity: `error`
- Auto-fix: yes

## Example

```js
// bad
let value = compute()
```

```js
// good
const value = compute()
```
