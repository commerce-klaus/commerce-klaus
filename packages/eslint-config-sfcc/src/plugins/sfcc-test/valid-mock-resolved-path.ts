import type { Rule } from "eslint"

import path from "node:path"

import { getStaticMemberName } from "../_utils/ast.js"
import { getStaticModulePath } from "../_utils/static-module.js"
import { isRuntime } from "./utils.js"

const validMockResolvedPath: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Require absolute file paths for resolved SFCC runtime mocks.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/valid-mock-resolved-path",
    },
    schema: [],
    messages: {
      absolutePath:
        "runtime.mockResolved() requires an absolute file path. Use runtime.mock() for module identifiers, or resolve the exact file path first.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          getStaticMemberName(node.callee as Rule.Node) !== "mockResolved" ||
          !isRuntime(context, node.callee.object as Rule.Node)
        ) {
          return
        }
        const argument = node.arguments[0] as Rule.Node | undefined
        const value = getStaticModulePath(argument)
        if (
          argument &&
          value !== undefined &&
          !path.posix.isAbsolute(value) &&
          !path.win32.isAbsolute(value)
        ) {
          context.report({ node: argument, messageId: "absolutePath" })
        }
      },
    }
  },
}

export default validMockResolvedPath
