---
"@commerce-klaus/sfcc-module-resolver": minor
---

Add shared Custom API discovery and OpenAPI (OAS 3.0) parsing helpers: `findApiJsonFiles`, `findCustomApiDefinitions`, `findOperationByOperationId`, `findSuccessOasResponse`, `getRequiredCustomApiExportsForScriptFile`, `loadOasDocument`, `resolveCustomApiScriptPath`, `resolveOasParameter`, `resolveOasRef`, `resolveOasRequestBody`, and `schemaContainsAdditionalProperties`. These back the Custom API type generation in `@commerce-klaus/typescript-sfcc` and the new `sfcc/valid-custom-api-export`, `sfcc/valid-custom-api-dir-name`, and `sfcc/no-custom-api-additional-properties` rules in `@commerce-klaus/eslint-config-sfcc`.
