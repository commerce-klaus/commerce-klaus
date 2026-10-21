import type { Rule } from "eslint"

import {
  analyzeEmptyArgument,
  asGlobalEmptyCall,
  isJavaScriptTarget,
} from "../_utils/empty-global.js"
import { withSfccSettings } from "../_utils/sfcc-settings.js"

const noAmbiguousEmpty: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require enough type information to determine which SFCC empty() semantics a value uses.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-ambiguous-empty",
      recommended: true,
    },
    schema: [],
    messages: {
      mixedType:
        "Cannot safely replace empty(): type {{type}} spans values with different SFCC empty semantics. Narrow the value before checking it.",
      unknownType:
        "Cannot safely replace empty(): the value type is unknown or too broad. Add or narrow its JSDoc type to receive a behavior-preserving replacement.",
    },
  },
  create: withSfccSettings((context) => {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      CallExpression(node: Rule.Node) {
        const callExpression = asGlobalEmptyCall(context, node)
        if (!callExpression) {
          return
        }

        const argument = callExpression.arguments?.[0]
        if (!argument) {
          context.report({ node: callExpression, messageId: "unknownType" })
          return
        }

        const analysis = analyzeEmptyArgument(context, argument)
        if (analysis.kind !== "ambiguous") {
          return
        }

        context.report({
          node: callExpression,
          messageId: analysis.reason === "mixed" ? "mixedType" : "unknownType",
          data: { type: analysis.typeText ?? "unknown" },
        })
      },
    }
  }),
}

export default noAmbiguousEmpty
