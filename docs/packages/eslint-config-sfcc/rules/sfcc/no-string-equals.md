# sfcc/no-string-equals

Disallows Java-style `String.equals(...)` calls in JavaScript files. Use strict equality (`===`) instead.

## What it checks

- Flags `.equals(...)` calls such as `value.equals("foo")` and `value["equals"]("foo")`
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`
- When TypeScript parser services with type information are available, only reports `.equals(...)` calls on string-like receivers
- Includes alias-based exact string literal unions (for example `type CustomerNo = "abc" | "def"`)
- Conservatively skips mixed unions that include non-string members (for example `string | HasEquals`)
- Without TypeScript type information, keeps the default strict behavior and reports all `.equals(...)` calls

## Why this rule exists

`String.equals(...)` is not a standard JavaScript String API. It is a Java-style pattern that is easy to carry over in Rhino-based environments.

Using strict equality makes intent explicit and keeps code idiomatic JavaScript.

## Default behavior

- Severity: `error`
- Auto-fix: suggestion available (replace `left.equals(right)` with `left === right`)

## Example

```js
// bad
if (customerNo.equals("12345")) {
  // ...
}
```

```js
// good
if (customerNo === "12345") {
  // ...
}
```
