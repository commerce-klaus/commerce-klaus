import sfccRules from "../rules/sfcc.js"
import sitegenesisRules from "../rules/sitegenesis.js"

const {
  "sfcc/no-ds-files": _noDsFiles,
  "sfcc/no-e4x-syntax": _noE4xSyntax,
  "sfcc/no-type-annotations": _noTypeAnnotations,
  ...oxlintSfccRules
} = sfccRules

export const oxlintRules: Record<string, "error"> = {
  ...oxlintSfccRules,
  ...sitegenesisRules,
} as Record<string, "error">

const oxlint: { jsPlugins: string[]; rules: typeof oxlintRules } = {
  jsPlugins: [
    "@commerce-klaus/eslint-config-sfcc/oxlint/sfcc",
    "@commerce-klaus/eslint-config-sfcc/oxlint/sitegenesis",
  ],
  rules: oxlintRules,
}

export default { lint: oxlint }
