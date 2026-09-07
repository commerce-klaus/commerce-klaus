import type { Linter } from "eslint"

import globals from "globals"

import sfccGlobals from "./sfcc-globals.js"

const disabledEnvironmentGlobals = Object.fromEntries(
  Object.keys({ ...globals.node, ...globals.browser }).map((name) => [name, "off"]),
)

const sfccLanguageGlobals = {
  ...disabledEnvironmentGlobals,
  ...globals.commonjs,
  ...sfccGlobals,
} satisfies NonNullable<Linter.LanguageOptions["globals"]>

export default sfccLanguageGlobals
