# `sfcc/prefer-generated-hook-types`

Require registered Salesforce system hook exports to use their generated `SfccHooks` function type.

## Why

The synchronized Script API declarations define the hook parameters and return type. A broad or handwritten annotation can hide changes in that platform contract.

## Incorrect

```js
/** @type {Function} */
function calculate(lineItemCtnr) {
  // ...
}

exports.calculate = calculate
```

## Correct

```js
/** @type {SfccHooks.OrderCalculate} */
function calculate(lineItemCtnr) {
  // ...
}

exports.calculate = calculate
```

The rule derives `SfccHooks.OrderCalculate` from the registered `dw.order.calculate` extension point and offers an ESLint suggestion for missing and incorrect `@type` annotations.

Project-specific hook names are ignored because Commerce Klaus cannot derive their project-local alias name from Salesforce's Script API declarations.
