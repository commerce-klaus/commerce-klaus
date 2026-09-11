import type { Rule } from "eslint"

import { createFilePathRuleListener } from "../_utils/file-path.js"

const isControllerFile = (filename: string): boolean =>
  /(?:^|\/)cartridge\/controllers\//u.test(filename)

const noControllers: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow controller files in SFCC cartridges.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-controllers",
      recommended: false,
    },
    schema: [],
    messages: {
      noControllers: "Controller files are not allowed in this cartridge.",
    },
  },
  create(context) {
    return createFilePathRuleListener(context, isControllerFile, "noControllers")
  },
}

export default noControllers
