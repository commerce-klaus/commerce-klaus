# sfcc/prefer-explicit-empty-check

Suggests an explicit JavaScript replacement for `empty(...)` when the argument type is known and the SFCC behavior can be preserved.

## SFCC behavior

Salesforce documents `empty(value)` as `true` for:

- `null`
- `undefined`
- strings with zero length
- arrays without elements
- collections without elements

Plain objects are not considered empty. Consequently, `Object.keys(value).length === 0` is not a behavior-preserving replacement for `empty(value)`.

See the official [`TopLevel.global.empty()` documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/scriptapi/html/api/class_TopLevel_global.html#TopLevel_global_empty_Object_DetailAnchor).

## Default behavior

- Severity: `warn`
- Auto-fix: none
- Suggestions: one behavior-preserving replacement

Suggestions are not applied automatically so callers can review repeated member access and simplify conditions with surrounding control-flow knowledge.

Set the `autofix` option to `true` to apply replacements that preserve both the result and evaluation behavior:

```js
{
  "sfcc/prefer-explicit-empty-check": ["error", { autofix: true }]
}
```

The [`empty-migration`](../../index.md#migrate-empty-in-batches) ESLint preset enables this option together with `sfcc/no-ambiguous-empty`. Oxlint can generate the equivalent override with `createOxlintEmptyMigrationOverride()`. Potentially side-effecting expressions remain suggestions in both migration modes.

The rule reads local `@type` and `@param` JSDoc annotations in both ESLint and Oxlint. When ESLint TypeScript parser services are available, it also follows inferred types and type aliases.

## Replacements

| Known argument type                          | Suggested condition  |
| -------------------------------------------- | -------------------- |
| `string` or array                            | `value.length === 0` |
| nullable string or array                     | `value === null      |     | value === undefined  |     | value.length === 0` |
| SFCC collection                              | `value.isEmpty()`    |
| nullable SFCC collection                     | `value === null      |     | value === undefined  |     | value.isEmpty()`    |
| nullable non-collection object               | `value === null      |     | value === undefined` |
| non-null plain object or non-empty primitive | `false`              |
| `null` or `undefined` only                   | `true`               |

## Example

```js [Invalid]
/** @type {string[] | null | undefined} */
const productIds = getProductIds()

if (empty(productIds)) {
  return
}
```

```js [Valid]
if (productIds === null || productIds === undefined || productIds.length === 0) {
  return
}
```
