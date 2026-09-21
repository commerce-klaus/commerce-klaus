# sfcc/no-string-raw

Disallows `String.raw` in SFCC server-side JavaScript.

## What it checks

- Reports tagged templates such as `` String.raw`line1\nline2` ``
- Reports direct calls such as `String.raw({ raw: ["value"] })`
- Ignores locally shadowed bindings named `String`
- Auto-fixes tagged templates without interpolations to an equivalent escaped string literal
- Leaves interpolated templates and direct calls for manual migration

## Why this rule exists

Affected Rhino versions can represent composed JavaScript strings as an internal `ConsString`. That value can leak through Java-backed object boundaries used by SFCC and fail where platform code expects a `java.lang.String`. The underlying interoperability behavior is discussed in [Rhino issue #247](https://github.com/mozilla/rhino/issues/247).

`String.raw` is valid ECMAScript and is implemented by Rhino, but it is not reliable across this SFCC runtime boundary. Regular string literals avoid that implementation path.

## Default behavior

- Severity: `error`
- Auto-fix: replaces interpolation-free tagged templates with an equivalent string literal

## Example

```js [Invalid]
// [!code error:1]
const lineBreak = String.raw`\r\n`
```

```js{1} [Valid]
const lineBreak = "\\r\\n"
```

Interpolated templates require a manual replacement so the migration does not introduce another Rhino string-concatenation boundary:

```js [Invalid]
// [!code error:1]
const path = String.raw`catalog\\${catalogId}`
```
