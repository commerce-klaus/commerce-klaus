# sfcc/no-e4x-syntax

Disallows JSX/E4X-like syntax in SFCC JavaScript. The rule keeps JavaScript parsing predictable and avoids unsupported runtime patterns.

## What it checks

- Flags any `JSXElement`
- Flags any `JSXFragment`
- Detects whether the markup is static or contains dynamic expressions

## Suggestions

- Static markup can be converted to an explicit `XML(...)` constructor call
- Dynamic markup is reported without an auto-suggestion, because manual refactoring is usually required

## Why this rule exists

SFCC code may be parsed in toolchains that are tolerant of E4X-like syntax, but that syntax is not valid plain JavaScript and is not a reliable fit for modern linting or runtime workflows.

## Default behavior

- Severity: `error`
- Auto-fix: none
- Suggestions: yes, for static markup

## Example

```js
// bad
const payload = (
  <request>
    <id>{id}</id>
  </request>
)
```

```js
// better
const payload = XML(`<request><id>${id}</id></request>`)
```
