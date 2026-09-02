# sfcc/no-custom-api-additional-properties

Disallows `additionalProperties` in [Custom API](https://developer.salesforce.com/docs/commerce/commerce-api/guide/custom-apis.html) request body schemas.

## What it checks

- Resolves the `api.json` in the same directory as the linted file and, for every endpoint entry whose `implementation` resolves to the linted file, loads the referenced OAS 3.0 `schema.yaml`
- Finds the operation matching the endpoint's `operationId` and resolves its `requestBody` (including `$ref`)
- Recursively scans the request body schema (`properties`, `items`, `$ref`) for any `additionalProperties` keyword
- Applies only to JavaScript-like inputs: `.js`, `.mjs`, `.cjs`, `.ds`, and `<input>`
- Has no effect on files that are not referenced as an `implementation` by any `api.json`

## Why this rule exists

Salesforce B2C Commerce does not register a Custom API endpoint whose request body schema contains `additionalProperties`, at any nesting level. That failure is only visible at code-version activation time. This rule surfaces the same restriction directly through ESLint.

## Default behavior

- Severity: `error`
- Auto-fix: none

## Example

```yaml [Invalid: schema.yaml]
requestBody:
  content:
    application/json:
      schema:
        type: object
        additionalProperties: true # [!code error]
        properties:
          points:
            type: number
```

```yaml{6-8} [Valid: schema.yaml]
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          points:
            type: number
```
