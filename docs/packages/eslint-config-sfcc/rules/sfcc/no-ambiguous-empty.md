# sfcc/no-ambiguous-empty

Reports `empty(...)` calls whose argument type is unknown, too broad, or combines values with different SFCC empty semantics.

## Why this rule exists

Replacing `empty(value)` safely requires knowing what `value` can contain. For example, SFCC treats an empty string as empty but does not treat an empty plain object as empty. Guessing between `.length`, `.isEmpty()`, an object-key check, or a null check can silently change behavior.

This rule turns an ambiguous migration into a concrete typing task. Add or narrow JSDoc type information, then [`sfcc/prefer-explicit-empty-check`](./prefer-explicit-empty-check.md) can offer a behavior-preserving replacement.

Local `@type` and `@param` annotations work in both ESLint and Oxlint. More complex inferred and aliased types require ESLint TypeScript parser services.

## Default behavior

- Severity: `warn`
- Auto-fix: none
- Suggestions: none

The [`empty-migration`](../../index.md#migrate-empty-in-batches) preset raises the severity to `error` so unresolved decisions remain visible after safe replacements have been applied.

## Unknown type

```js [Invalid]
function handle(value) {
  return empty(value)
}
```

Add the actual contract instead of choosing a replacement by inspection:

```js [Valid]
/**
@param {string | null | undefined} value
*/
function handle(value) {
  return empty(value)
}
```

The companion rule can now suggest:

```js
value === null || value === undefined || value.length === 0
```

## Mixed semantics

A union such as `string | Record<string, unknown>` remains ambiguous even with type information. Empty strings are SFCC-empty, while non-null plain objects are not. Narrow the value before checking it.

Choose the replacement from the actual contract rather than the current runtime value:

- use an explicit nullish check when only absence counts as empty;
- use `.length === 0` for strings and arrays;
- use `.isEmpty()` for SFCC collections.
