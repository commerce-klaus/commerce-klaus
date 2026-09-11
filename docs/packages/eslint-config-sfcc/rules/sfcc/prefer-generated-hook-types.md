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

The rule derives `SfccHooks.OrderCalculate` from the registered `dw.order.calculate` extension point and verifies that the alias exists in the synchronized `.b2c-script-types/types/sfcc-hooks.generated.d.ts` declarations. It offers an ESLint suggestion for missing and incorrect `@type` annotations only when `typescript-sfcc` generated that alias.

Project-specific hooks and system extension points without a generated Salesforce Script API declaration are ignored. Run `sfcc-ts-sync-types` before ESLint to refresh the generated aliases.
