import type { Linter } from "eslint"

// Disable eslint-plugin-unicorn rules that suggest or require ES2015+ syntax
// not supported on SFCC sandboxes (Rhino engine).
const unicorn: Linter.RulesRecord = {
  "unicorn/logical-assignment-operators": "off",

  "unicorn/no-array-for-each": "off",
  "unicorn/no-array-sort": "off",
  "unicorn/no-computed-property-existence-check": "off",
  "unicorn/no-for-loop": "off",
  "unicorn/no-useless-iterator-to-array": "off",

  "unicorn/numeric-separators-style": "off",

  "unicorn/prefer-array-flat": "off",
  "unicorn/prefer-array-flat-map": "off",
  "unicorn/prefer-at": "off",
  "unicorn/prefer-default-parameters": "off",
  "unicorn/prefer-iterator-to-array-at-end": "off",
  "unicorn/prefer-logical-operator-over-ternary": "off",
  "unicorn/prefer-modern-math-apis": "off",
  "unicorn/prefer-module": "off",
  "unicorn/prefer-node-protocol": "off",
  "unicorn/prefer-optional-catch-binding": "off",
  "unicorn/prefer-reflect-apply": "off",
  "unicorn/prefer-structured-clone": "off",
  "unicorn/prefer-string-replace-all": "off",
  "unicorn/prefer-spread": "off",
  "unicorn/prefer-unicode-code-point-escapes": "off",
}

export default unicorn
