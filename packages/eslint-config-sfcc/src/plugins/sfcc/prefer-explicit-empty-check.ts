import type { Rule } from "eslint"

import {
  analyzeEmptyArgument,
  asGlobalEmptyCall,
  buildExplicitEmptyReplacement,
  isJavaScriptTarget,
} from "../_utils/empty-global.js"
import { withSfccSettings } from "../_utils/sfcc-settings.js"

const preferExplicitEmptyCheck: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer an explicit, behavior-preserving JavaScript check when the SFCC empty() argument type is known.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-explicit-empty-check",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      preferExplicitCheck:
        "Replace SFCC empty() with an explicit check that preserves its behavior for this value type.",
      suggestExplicitCheck: "Replace with {{replacement}}.",
    },
  },
  create: withSfccSettings((context) => {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      CallExpression(node: Rule.Node) {
        const callExpression = asGlobalEmptyCall(context, node)
        const argument = callExpression?.arguments?.[0]
        if (!callExpression || !argument) {
          return
        }

        const analysis = analyzeEmptyArgument(context, argument)
        if (analysis.kind === "ambiguous") {
          return
        }

        const replacement = buildExplicitEmptyReplacement(
          analysis,
          context.sourceCode.getText(argument),
        )

        context.report({
          node: callExpression,
          messageId: "preferExplicitCheck",
          suggest: [
            {
              messageId: "suggestExplicitCheck",
              data: { replacement },
              fix: (fixer) => fixer.replaceText(callExpression, replacement),
            },
          ],
        })
      },
    }
  }),
}

export default preferExplicitEmptyCheck
