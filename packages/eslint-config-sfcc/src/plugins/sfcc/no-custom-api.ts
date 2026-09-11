import type { Rule } from "eslint"

import { createFilePathRuleListener } from "../_utils/file-path.js"

const isCustomApiFile = (filename: string): boolean =>
  /(?:^|\/)cartridge\/rest-apis\//u.test(filename)

const noCustomApi: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Custom API implementation files in selected cartridges.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-custom-api",
      recommended: false,
    },
    schema: [],
    messages: {
      customApi: "Custom API files are not allowed in this cartridge.",
    },
  },
  create(context) {
    return createFilePathRuleListener(context, isCustomApiFile, "customApi")
  },
}

export default noCustomApi
