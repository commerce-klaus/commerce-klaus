import type { Rule } from "eslint"

import {
  analyzeEmptyArgument,
  asGlobalEmptyCall,
  buildExplicitEmptyReplacement,
  canSuggestEmptyReplacement,
  getContextualEmptyReplacement,
  isJavaScriptTarget,
} from "../_utils/empty-global.js"
import { withSfccSettings } from "../_utils/sfcc-settings.js"

const noEmptyGlobal: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the SFCC-specific empty() global in favor of explicit standard JavaScript checks.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-empty-global",
      recommended: false,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      forbiddenEmptyGlobal:
        "empty() is an SFCC-specific global with type-dependent semantics. Replace it with an explicit check.",
      forbiddenEmptyGlobalManual:
        "empty() is an SFCC-specific global. Its explicit replacement must be applied manually so the argument remains evaluated exactly once.",
      suggestExplicitCheck: "Replace with {{replacement}}.",
    },
  },
  create: withSfccSettings((context, sfccSettings) => {
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
        let replacement: string | undefined
        let requiresManualReplacement = false
        if (argument) {
          const analysis = analyzeEmptyArgument(context, argument, sfccSettings)
          if (analysis.kind !== "ambiguous") {
            const explicitReplacement = buildExplicitEmptyReplacement(
              analysis,
              context.sourceCode.getText(argument),
            )
            if (canSuggestEmptyReplacement(analysis, argument)) {
              replacement = getContextualEmptyReplacement(callExpression, explicitReplacement)
            } else {
              requiresManualReplacement = true
            }
          }
        }

        context.report({
          node: callExpression,
          messageId: requiresManualReplacement
            ? "forbiddenEmptyGlobalManual"
            : "forbiddenEmptyGlobal",
          suggest: replacement
            ? [
                {
                  messageId: "suggestExplicitCheck",
                  data: { replacement },
                  fix: (fixer) => fixer.replaceText(callExpression, replacement),
                },
              ]
            : [],
        })
      },
    }
  }),
}

export default noEmptyGlobal
