# sfcc/no-ds-files

Disallows legacy `.ds` files in SFCC projects. Rename them to `.js` and keep the module CommonJS-compatible.

## What it checks

- Flags the file itself when the filename ends in `.ds`
- Runs on the program node, so the whole file is treated as invalid once it is a `.ds` file

## Why this rule exists

`.ds` is a legacy SFCC file extension. Keeping these files around makes code harder to modernize and can hide the fact that the project should be using standard JavaScript files.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```js
// bad: cart.ds
module.exports = function () {
  return true
}
```

```js
// good: cart.js
module.exports = function () {
  return true
}
```
