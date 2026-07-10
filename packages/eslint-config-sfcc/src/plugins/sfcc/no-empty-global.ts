import type { Rule } from "eslint"

import { withSfccSettings } from "../_utils/sfcc-settings.js"

const COLLECTION_CONSTRUCTORS = new Set([
  "ArrayList",
  "Collection",
  "FilteringCollection",
  "HashSet",
  "LinkedHashSet",
  "List",
  "Set",
  "SortedSet",
])

function isJavaScriptTarget(filename: string): boolean {
  if (filename === "<input>") {
    return true
  }

  return /\.(?:[cm]?js|ds)$/iu.test(filename)
}

function getPropertyName(node: Rule.Node): string | undefined {
  if (node.type === "Identifier") {
    return node.name
  }

  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name
  }

  return undefined
}

function getEmptySuggestions(
  argument: Rule.Node,
  sourceCode: { getText(node: Rule.Node): string },
) {
  const text = sourceCode.getText(argument)

  if (argument.type === "Literal" && typeof argument.value === "string") {
    return [
      {
        messageId: "suggestLengthCheck",
        data: { replacement: `${text}.length === 0` },
        fix: (fixer: Rule.RuleFixer) => fixer.replaceText(argument, `${text}.length === 0`),
      },
    ]
  }

  if (argument.type === "TemplateLiteral" && argument.expressions.length === 0) {
    return [
      {
        messageId: "suggestLengthCheck",
        data: { replacement: `${text}.length === 0` },
        fix: (fixer: Rule.RuleFixer) => fixer.replaceText(argument, `${text}.length === 0`),
      },
    ]
  }

  if (argument.type === "ArrayExpression") {
    return [
      {
        messageId: "suggestLengthCheck",
        data: { replacement: `${text}.length === 0` },
        fix: (fixer: Rule.RuleFixer) => fixer.replaceText(argument, `${text}.length === 0`),
      },
    ]
  }

  if (argument.type === "ObjectExpression") {
    return [
      {
        messageId: "suggestObjectKeysCheck",
        data: { replacement: `Object.keys(${text}).length === 0` },
        fix: (fixer: Rule.RuleFixer) =>
          fixer.replaceText(argument, `Object.keys(${text}).length === 0`),
      },
    ]
  }

  if (argument.type === "NewExpression") {
    const calleeName = getPropertyName(argument.callee as Rule.Node)
    if (calleeName && COLLECTION_CONSTRUCTORS.has(calleeName)) {
      return [
        {
          messageId: "suggestCollectionCheck",
          data: { replacement: `${text}.isEmpty()` },
          fix: (fixer: Rule.RuleFixer) => fixer.replaceText(argument, `${text}.isEmpty()`),
        },
      ]
    }
  }

  return []
}

const noEmptyGlobal: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the SFCC-specific empty() global in JavaScript files. Use explicit checks such as .length, Object.keys(), or .isEmpty() instead.",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/no-empty-global.md",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      forbiddenEmptyGlobal: "empty() is an SFCC-specific global and is not standard JavaScript.",
      suggestLengthCheck: "Use {{replacement}} instead.",
      suggestObjectKeysCheck: "Use {{replacement}} for plain objects instead.",
      suggestCollectionCheck: "Use {{replacement}} for SFCC collections instead.",
    },
  },
  create: withSfccSettings((context) => {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      CallExpression(node: Rule.Node) {
        const callExpression = node as Rule.Node & {
          arguments?: Rule.Node[]
          callee?: Rule.Node & { type?: string; name?: string }
        }

        if (
          callExpression.callee?.type !== "Identifier" ||
          callExpression.callee.name !== "empty"
        ) {
          return
        }

        const argument = callExpression.arguments?.[0]
        if (!argument) {
          context.report({ node: callExpression.callee, messageId: "forbiddenEmptyGlobal" })
          return
        }

        context.report({
          node: callExpression.callee,
          messageId: "forbiddenEmptyGlobal",
          suggest: getEmptySuggestions(argument, context.sourceCode),
        })
      },
    }
  }),
}

export default noEmptyGlobal
