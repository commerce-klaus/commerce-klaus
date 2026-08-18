import type { Linter } from "eslint"

// Enable eslint-plugin-es rules to forbid JavaScript features not supported
// on SFCC sandboxes. The ES2015 baseline is applied in
// src/configs/recommended.ts; this file only contains SFCC-specific overrides.
const es: Linter.RulesRecord = {
  // features that are supported
  "es-x/no-array-prototype-includes": "off",
  "es-x/no-exponential-operators": "off",
  "es-x/no-object-values": "off",
  "es-x/no-object-entries": "off",
  "es-x/no-for-of-loops": "off",
  "es-x/no-string-prototype-padstart-padend": "off",

  // ES2015 features not supported on SFCC/Rhino:
  "es-x/no-classes": "error",
  "es-x/no-computed-properties": "error",
  "es-x/no-default-parameters": "error",
  "es-x/no-dynamic-import": "error",
  "es-x/no-modules": "error",
  "es-x/no-new-target": "error",
  "es-x/no-promise": "error",
  "es-x/no-proxy": "error",
  "es-x/no-reflect": "error",
  "es-x/no-regexp-u-flag": "error",
  "es-x/no-regexp-y-flag": "error",
  "es-x/no-rest-parameters": "error",
  "es-x/no-rest-spread-properties": "error",
  "es-x/no-spread-elements": "error",
  "es-x/no-subclassing-builtins": "error",
}

export default es
