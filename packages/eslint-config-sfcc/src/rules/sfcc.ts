import type { Linter } from "eslint"

const sfcc: Linter.RulesRecord = {
  "sfcc/no-ds-files": "error",
  "sfcc/no-empty-global": "error",
  "sfcc/no-e4x-syntax": "error",
  "sfcc/no-custom-api-additional-properties": "error",
  "sfcc/no-custom-api-response-methods": "error",
  "sfcc/no-type-annotations": "error",
  "sfcc/no-rhino-import-globals": "error",
  "sfcc/no-string-equals": "error",
  "sfcc/prefer-const": "error",
  "sfcc/rhino-const-compat": "error",
  "sfcc/rhino-const-conflict": "error",
  "sfcc/valid-custom-api-dir-name": "error",
  "sfcc/valid-custom-api-export": "error",
  "sfcc/valid-hook-export": "error",
  "sfcc/valid-require-path": "error",
}

export default sfcc
