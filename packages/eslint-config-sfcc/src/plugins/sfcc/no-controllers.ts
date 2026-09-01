import type { Rule } from "eslint"

function isControllerFile(filename: string): boolean {
  const normalizedFilename = filename.replaceAll("\\", "/")
  return /(?:^|\/)cartridge\/controllers\//u.test(normalizedFilename)
}

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
    return {
      Program(node) {
        if (isControllerFile(context.filename)) {
          context.report({ node, messageId: "noControllers" })
        }
      },
    }
  },
}

export default noControllers
