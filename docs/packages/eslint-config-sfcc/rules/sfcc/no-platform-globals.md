# sfcc/no-platform-globals

Disallows stateful SFCC platform globals when a project requires dependencies to be explicit.

This rule is opt-in and is not part of the recommended config. It enforces an architectural convention that should be adopted deliberately.

## What it checks

- Reports references to the global `customer`, `request`, `response`, and `session` objects
- Ignores parameters, variables, and imports that locally define the same names
- Supports an allow list for incremental adoption or framework boundaries

## Options

The optional `allow` array accepts `"customer"`, `"request"`, `"response"`, and `"session"`. All four globals are disallowed by default.

```js [eslint.config.js]
export default {
  rules: {
    "sfcc/no-platform-globals": ["error", { allow: ["request", "response"] }],
  },
}
```

## Why this rule exists

Implicit request and session state couples business logic to the SFCC runtime. Passing these values through function parameters makes dependencies visible and allows the same logic to be tested without platform globals.

## Default behavior

- Severity: off (opt-in)
- Allowed platform globals: none
- Auto-fix: none

## Examples

```js [Invalid]
function getCustomerNumber() {
  return customer.profile.customerNo // [!code error]
}
```

```js [Valid]
function getCustomerNumber(currentCustomer) {
  return currentCustomer.profile.customerNo
}
```
