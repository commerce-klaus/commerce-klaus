import type { Rule } from "eslint"

function isCustomApiFile(filename: string): boolean {
  const normalizedFilename = filename.replaceAll("\\", "/")
  return /(?:^|\/)cartridge\/rest-apis\//u.test(normalizedFilename)
}

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
    return {
      Program(node) {
        if (isCustomApiFile(context.filename)) {
          context.report({ node, messageId: "customApi" })
        }
      },
    }
  },
}

export default noCustomApi
