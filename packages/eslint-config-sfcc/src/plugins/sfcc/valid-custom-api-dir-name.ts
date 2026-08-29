import type { Rule } from "eslint"

import { getRequiredCustomApiExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"
import path from "node:path"

import { isJavaScriptTarget } from "../_utils/commonjs-exports.ts"

const VALID_DIR_NAME = /^[a-z0-9-]+$/u

const validCustomApiDirName: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires Custom API rest-apis directory names to contain only lowercase alphanumeric characters and hyphens.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/valid-custom-api-dir-name",
      recommended: true,
    },
    schema: [],
    messages: {
      invalidDirName:
        'Custom API directory name "{{dirName}}" must only contain lowercase letters, numbers, and hyphens.',
    },
  },
  create(context): Rule.RuleListener {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      "Program:exit"(node) {
        if (getRequiredCustomApiExportsForScriptFile(context.filename).length === 0) {
          return
        }

        const dirName = path.basename(path.dirname(path.resolve(context.filename)))
        if (!VALID_DIR_NAME.test(dirName)) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: "invalidDirName",
            data: { dirName },
          })
        }
      },
    }
  },
}

export default validCustomApiDirName
