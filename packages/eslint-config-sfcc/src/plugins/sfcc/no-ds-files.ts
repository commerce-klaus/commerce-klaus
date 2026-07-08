import type { Rule } from "eslint"

import { withSfccSettings } from "../_utils/sfcc-settings.js"

function isDsFile(filename: string): boolean {
  return /\.ds$/iu.test(filename)
}

const noDsFiles: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow .ds files in SFCC projects. Use .js files instead.",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/no-ds-files.md",
      recommended: true,
    },
    schema: [],
    messages: {
      noDsFiles:
        "Legacy .ds files are not allowed. Rename this file to .js and use CommonJS modules.",
    },
  },
  create: withSfccSettings((context, _sfccSettings) => {
    const listeners: Rule.RuleListener = {
      Program(node) {
        if (!isDsFile(context.filename)) {
          return
        }

        context.report({ node, messageId: "noDsFiles" })
      },
    }

    return listeners
  }),
}

export default noDsFiles
