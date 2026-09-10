# `sfcc/prefer-generated-job-step-types`

Require effective custom job step exports to use the function type generated from `steptypes.json`.

## Why

A broad or handwritten annotation can hide the real parameter names, enum values, lifecycle arguments, and return type declared by job metadata. `sfcc-ts-sync-types` already exposes that contract through `SfccJobSteps.Definitions`; using it keeps the implementation aligned when metadata changes.

## Incorrect

```js
/** @type {Function} */
const run = function (parameters, stepExecution) {
  // ...
}

exports.run = run
```

## Correct

```js
/** @type {SfccJobSteps.Definitions["custom.GenerateFeed"]["Functions"]["run"]} */
function run(parameters, stepExecution) {
  // ...
}

exports.run = run
```

The rule resolves effective registrations in cartridge-path order and ignores unregistered or overridden implementations. It supports function declarations and functions assigned to local variables, and offers an ESLint suggestion for missing and incorrect `@type` annotations.

This rule is enabled by the opt-in `generated-types` preset, not by `recommended`, because the generated declarations must be available to the JavaScript project.
