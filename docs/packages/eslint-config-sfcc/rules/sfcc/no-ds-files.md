# sfcc/no-ds-files

Disallows legacy `.ds` files in SFCC projects. Rename them to `.js` and keep the module CommonJS-compatible.

## What it checks

- Flags the file itself when the filename ends in `.ds`
- Runs on the program node, so the whole file is treated as invalid once it is a `.ds` file

## Why this rule exists

`.ds` is a legacy SFCC file extension. Keeping these files around makes code harder to modernize and can hide the fact that the project should be using standard JavaScript files.

## Oxlint support

::: warning ESLint only

Oxlint ignores `.ds` files during file discovery, so its JavaScript plugin never receives the file and cannot run this rule. Use the focused [`eslint-after-oxlint`](../../#eslint-after-oxlint) config during migrations or in CI when `.ds` files must remain prohibited.

:::

## Default behavior

- 🔴 **Severity:** `error`
- ➖ **Auto-fix:** none

## Example

::: code-group

```js [cart.ds]
// [!code error:3]
module.exports = function () {
  return true
}
```

```js{1-3} [cart.js]
module.exports = function () {
  return true
}
```

:::
