# sfcc/valid-job-step-export

Requires static CommonJS exports for the functions configured for the current file in `steptypes.json`.

## What it checks

- Resolves effective script module and chunk script module definitions in cartridge-path order
- For script module steps, requires the configured `function` export, or `execute` when no function is specified
- For chunk script module steps, requires the configured lifecycle exports, including the default `read`, `process`, and `write` functions
- Recognizes `exports.method = ...`, `module.exports.method = ...`, and `module.exports = { method: ... }` (including shorthand properties) as valid static exports
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`
- Has no effect on files that are not referenced by an effective `steptypes.json` definition

## Why this rule exists

A job step definition is only executable when its module exports every configured function. This rule reports a missing export in the implementation file during editing and lint-only CI runs, before the job reaches an SFCC instance.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Script module example

```json{6-7} [steptypes.json]
{
  "step-types": {
    "script-module-step": [
      {
        "@type-id": "custom.Sample",
        "module": "app_custom/cartridge/scripts/jobs/sample",
        "function": "run"
      }
    ]
  }
}
```

```js [Invalid: sample.js]
exports.execute = function () {} // [!code error]
```

```js [Valid: sample.js]
exports.run = function () {}
```

## Chunk module example

When function names are omitted, a chunk module must export `read`, `process`, and `write`:

```js [Valid: sample-chunk.js]
exports.read = function () {}
exports.process = function (item) {}
exports.write = function (items) {}
```
