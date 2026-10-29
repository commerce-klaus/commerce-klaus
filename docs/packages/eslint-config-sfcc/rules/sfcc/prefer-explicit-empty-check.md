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

- 🟡 **Severity:** `warn`
- 🛠️ **Auto-fix:** opt-in through the `autofix` option
- 💡 **Suggestions:** one behavior-preserving replacement

Suggestions are not applied automatically so callers can review repeated member access and simplify conditions with surrounding control-flow knowledge.

Set the `autofix` option to `true` to apply replacements that preserve both the result and evaluation behavior:

```js
{
  "sfcc/prefer-explicit-empty-check": ["error", { autofix: true }]
}
```

Autofix is limited to positive checks whose expressions can be evaluated safely.
Type-derived replacements retain explicit `null` and `undefined` guards even
when the static type is non-null, because legacy callers and optional platform
attributes can violate that annotation at runtime. Member access and negated
checks remain available as editor suggestions so applying a replacement does
not duplicate a getter evaluation or introduce conflicting lint diagnostics.

::: warning Preserve one evaluation

An editor suggestion shows the known replacement but cannot introduce a well-named local variable. Cache a member access or method result before expanding it when a getter, proxy, or method could return a different value or perform work on each access.

:::

The [`empty-migration`](../../index.md#migrate-empty-in-batches) ESLint preset enables this option together with `sfcc/no-ambiguous-empty`. Oxlint can generate the equivalent override with `createOxlintEmptyMigrationOverride()`. Potentially side-effecting expressions remain suggestions in both migration modes.

## Oxlint support

::: info Available in Oxlint with ESLint type refinement

Oxlint uses literals, constant string initializers, directly recognizable SFCC collections, and local `@type` or `@param` JSDoc to select safe replacements. ESLint TypeScript parser services additionally follow inferred types and aliases, producing suggestions or fixes for more calls.

:::

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

`0` and `false` belong to the non-empty primitive row. Do not use `!value` as a general replacement because it changes SFCC behavior for both values.

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

## Stateful member access

```js [Invalid]
if (empty(customer.custom.loyaltyID)) {
  return
}
```

Read the value once before applying the suggested condition:

```js [Valid]
const loyaltyID = customer.custom.loyaltyID
if (loyaltyID === null || loyaltyID === undefined || loyaltyID.length === 0) {
  return
}
```

## Always-empty and never-empty values

A `true` or `false` replacement indicates a redundant condition rather than a useful runtime check. For example, a property read before its constructor assignment can be statically always `undefined`. Review constructor reuse and `.call()` patterns before removing that guard. Likewise, a non-null number or boolean is never SFCC-empty, including `0` and `false`.

## Native and adapter collections

Use `isEmpty()` for a native `dw.util.Collection`. A test double for that platform type should implement the same method. If an application deliberately accepts another collection shape, such as an adapter with an `empty` property, document and check that adapter contract separately rather than applying the native collection replacement to it.
