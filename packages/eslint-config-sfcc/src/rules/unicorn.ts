import type { Linter } from "eslint"

// Disable eslint-plugin-unicorn rules whose suggestions are unsupported by
// SFCC/Rhino or conflict with the SFCC compatibility rules.
const unicorn: Linter.RulesRecord = {
  "unicorn/logical-assignment-operators": "off", // Logical assignment syntax is unsupported.

  "unicorn/no-array-sort": "off", // Array#toSorted is unavailable.
  "unicorn/no-array-reverse": "off", // Array#toReversed is unavailable.
  "unicorn/no-array-splice": "off", // Array#toSpliced is unavailable.
  "unicorn/no-computed-property-existence-check": "off", // Object.hasOwn is unavailable.
  "unicorn/no-useless-iterator-to-array": "off", // Iterator helpers are unavailable.

  "unicorn/no-for-loop": "off", // SFCC collections are not Rhino iterables.
  "unicorn/no-for-each": "off", // for-of replacements can break SFCC host objects.

  "unicorn/numeric-separators-style": "off", // Numeric separators are unsupported syntax.

  "unicorn/prefer-array-flat": "off", // Array#flat is unavailable.
  "unicorn/prefer-array-flat-map": "off", // Array#flatMap is unavailable.
  "unicorn/prefer-array-find": "off", // Array#find and Array#findLast are unavailable.
  "unicorn/prefer-array-from-async": "off", // Array.fromAsync is unavailable.
  "unicorn/prefer-array-last-methods": "off", // Array#findLast methods are unavailable.
  "unicorn/prefer-at": "off", // Array#at is unavailable.
  "unicorn/prefer-class-fields": "off", // Class fields are unsupported syntax.
  "unicorn/prefer-default-parameters": "off", // Default parameters are unsupported syntax.
  "unicorn/prefer-group-by": "off", // Object.groupBy and Map.groupBy are unavailable.
  "unicorn/prefer-iterator-helpers": "off", // Iterator helpers are unavailable.
  "unicorn/prefer-iterator-to-array": "off", // Iterator#toArray is unavailable.
  "unicorn/prefer-iterator-to-array-at-end": "off", // Iterator#toArray is unavailable.
  "unicorn/prefer-logical-operator-over-ternary": "off", // Can suggest unsupported nullish syntax.
  "unicorn/prefer-modern-math-apis": "off", // Suggested Math APIs are unavailable.
  "unicorn/prefer-module": "off", // Cartridge modules use CommonJS.
  "unicorn/prefer-optional-catch-binding": "off", // Optional catch bindings are unsupported syntax.
  "unicorn/prefer-private-class-fields": "off", // Private fields are unsupported syntax.
  "unicorn/prefer-promise-try": "off", // Promise.try is unavailable.
  "unicorn/prefer-promise-with-resolvers": "off", // Promise.withResolvers is unavailable.
  "unicorn/prefer-queue-microtask": "off", // queueMicrotask is unavailable.
  "unicorn/prefer-reflect-apply": "off", // Reflect is unavailable.
  "unicorn/prefer-set-methods": "off", // Modern Set methods are unavailable.
  "unicorn/prefer-string-raw": "off", // String.raw is unavailable.
  "unicorn/prefer-string-match-all": "off", // String#matchAll is unavailable.
  "unicorn/prefer-structured-clone": "off", // structuredClone is unavailable.
  "unicorn/prefer-string-replace-all": "off", // String#replaceAll is unavailable.
  "unicorn/prefer-spread": "off", // Spread syntax is unsupported.
  "unicorn/prefer-unicode-code-point-escapes": "off", // Code point escapes are unsupported syntax.

  // ⚠️ e.g. `dw.io.FileWriter` needs uppercase `UTF-8` encoding, but this rule enforces lowercase `utf-8`.
  "unicorn/text-encoding-identifier-case": "off", // SFCC expects uppercase encoding names.
}

export default unicorn
