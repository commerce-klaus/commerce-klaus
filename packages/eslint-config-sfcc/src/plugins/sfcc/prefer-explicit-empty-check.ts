import type { Rule } from "eslint"

import {
  analyzeEmptyArgument,
  asGlobalEmptyCall,
  buildExplicitEmptyReplacement,
  canAutofixEmptyReplacement,
  canSuggestEmptyReplacement,
  getContextualEmptyReplacement,
  isJavaScriptTarget,
} from "../_utils/empty-global.js"
import { withSfccSettings } from "../_utils/sfcc-settings.js"

interface RuleOptions {
  autofix?: boolean
}

const preferExplicitEmptyCheck: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer an explicit, behavior-preserving JavaScript check when the SFCC empty() argument type is known.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-explicit-empty-check",
      recommended: true,
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          autofix: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      alwaysEmpty:
        "SFCC empty() is always true for the inferred type {{type}}. Review the runtime contract, then remove the redundant condition or preserve any required argument side effects.",
      neverEmpty:
        "SFCC empty() is always false for the inferred type {{type}}. Review the runtime contract, then remove the redundant condition or preserve any required argument side effects.",
      preferExplicitCheck:
        "Replace SFCC empty() with an explicit check that preserves its behavior for the inferred type {{type}}.",
      reviewEvaluation:
        "The explicit replacement for inferred type {{type}} repeats this expression. Cache the value first so the original expression remains evaluated once.",
      suggestExplicitCheck: "Replace with {{replacement}}.",
    },
  },
  create: withSfccSettings((context, sfccSettings) => {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }
    const [{ autofix = false } = {}] = context.options as [RuleOptions?]

    return {
      CallExpression(node: Rule.Node) {
        const callExpression = asGlobalEmptyCall(context, node)
        const argument = callExpression?.arguments?.[0]
        if (!callExpression || !argument) {
          return
        }

        const analysis = analyzeEmptyArgument(context, argument, sfccSettings)
        if (analysis.kind === "ambiguous") {
          return
        }

        const replacement = buildExplicitEmptyReplacement(
          analysis,
          context.sourceCode.getText(argument),
        )
        const autofixReplacement =
          autofix &&
          callExpression.parent?.type !== "UnaryExpression" &&
          canAutofixEmptyReplacement(analysis, argument)
            ? getContextualEmptyReplacement(callExpression, replacement)
            : undefined
        const repeatsExpression =
          analysis.nullable &&
          (argument.type === "CallExpression" || argument.type === "MemberExpression")
        const messageId =
          analysis.kind === "always-empty"
            ? "alwaysEmpty"
            : analysis.kind === "nullish-only" && !analysis.nullable
              ? "neverEmpty"
              : repeatsExpression
                ? "reviewEvaluation"
                : "preferExplicitCheck"
        const suggestionReplacement = canSuggestEmptyReplacement(analysis, argument)
          ? getContextualEmptyReplacement(callExpression, replacement)
          : undefined

        context.report({
          node: callExpression,
          messageId,
          data: { type: analysis.typeText ?? analysis.kind },
          fix: autofixReplacement
            ? (fixer) => fixer.replaceText(callExpression, autofixReplacement)
            : undefined,
          suggest: suggestionReplacement
            ? [
                {
                  messageId: "suggestExplicitCheck",
                  data: { replacement: suggestionReplacement },
                  fix: (fixer) => fixer.replaceText(callExpression, suggestionReplacement),
                },
              ]
            : [],
        })
      },
    }
  }),
}

export default preferExplicitEmptyCheck
