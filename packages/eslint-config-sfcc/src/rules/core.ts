import type { Linter } from "eslint"

// Disable ESLint core rules that suggest syntax or APIs unsupported by SFCC/Rhino.
// Supported ES2015+ syntax and APIs should remain available to core rules.
const core: Linter.RulesRecord = {
  "no-restricted-properties": "off",
  "object-shorthand": "off",
  "prefer-const": "off",
  "prefer-object-has-own": "off",
  "prefer-object-spread": "off",
  "prefer-rest-params": "off",
  "prefer-spread": "off",
  "preserve-caught-error": "off",
}

export default core
