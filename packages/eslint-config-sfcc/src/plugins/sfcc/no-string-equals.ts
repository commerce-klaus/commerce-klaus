import type { Rule } from "eslint"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import {
  getExactStringLiteralValuesForNode,
  getTypeTextForNode,
  getTypeWordsForNode,
  hasStringLikeWithoutConcreteNonString,
  isAmbiguousTypeWord,
  parseTypeWordsFromTypeText,
} from "../_utils/type-aware.js"

function isJavaScriptTarget(filename: string): boolean {
  if (filename === "<input>") {
    return true
  }

  return /\.(?:[cm]?(?:js|ts)|ds)$/iu.test(filename)
}

function isEqualsProperty(node: Rule.Node): boolean {
  if (node.type === "Identifier") {
    return node.name === "equals"
  }

  if (node.type === "Literal") {
    return node.value === "equals"
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked === "equals"
  }

  return false
}

function getEqualitySuggestion(
  callExpression: Rule.Node & {
    callee: Rule.Node & { optional?: boolean }
    arguments?: Rule.Node[]
    optional?: boolean
  },
  sourceCode: { getText(node: Rule.Node): string },
) {
  if (!Array.isArray(callExpression.arguments) || callExpression.arguments.length !== 1) {
    return []
  }

  const [argument] = callExpression.arguments
  if (!argument || argument.type === "SpreadElement") {
    return []
  }

  if (callExpression.callee.type !== "MemberExpression") {
    return []
  }

  // Optional chaining has different nullish semantics; avoid offering unsafe replacements.
  if (callExpression.optional || callExpression.callee.optional) {
    return []
  }

  const left = sourceCode.getText(callExpression.callee.object as Rule.Node)
  const right = sourceCode.getText(argument)
  const replacement = `${left} === ${right}`

  return [
    {
      messageId: "suggestStrictEquality",
      data: { replacement },
      fix: (fixer: Rule.RuleFixer) => fixer.replaceText(callExpression, replacement),
    },
  ]
}

function parseTypeWords(typeText: string): string[] {
  return parseTypeWordsFromTypeText(typeText)
    .map((part) => part.replace(/\[\]$/u, ""))
    .filter(Boolean)
}

function isStringLikeType(typeText: string): boolean {
  return hasStringLikeWithoutConcreteNonString(parseTypeWords(typeText))
}

function isAmbiguousType(typeText: string): boolean {
  const words = parseTypeWords(typeText)
  if (words.length === 0) {
    return true
  }

  return words.some((word) => isAmbiguousTypeWord(word))
}

function shouldReportBasedOnTypes(
  context: Rule.RuleContext,
  memberExpression: Rule.Node & { object: Rule.Node },
): boolean {
  const exactStringLiterals = getExactStringLiteralValuesForNode(context, memberExpression.object)
  if (exactStringLiterals && exactStringLiterals.length > 0) {
    return true
  }

  const typeWords = getTypeWordsForNode(context, memberExpression.object)
  if (typeWords.length > 0) {
    if (hasStringLikeWithoutConcreteNonString(typeWords)) {
      return true
    }

    if (typeWords.some((word) => isAmbiguousTypeWord(word))) {
      return true
    }

    return false
  }

  const typeText = getTypeTextForNode(context, memberExpression.object)
  if (!typeText) {
    return true
  }

  if (isStringLikeType(typeText)) {
    return true
  }

  if (isAmbiguousType(typeText)) {
    return true
  }

  if (isExplicitStringTypedIdentifier(context, memberExpression.object)) {
    return true
  }

  return false
}

function isExplicitStringTypedIdentifier(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "Identifier") {
    return false
  }

  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const resolved = reference?.resolved
  const definitionNode = resolved?.defs?.[0]?.node as
    | ({
        type?: string
        id?: {
          type?: string
          typeAnnotation?: {
            typeAnnotation?: { type?: string; typeName?: { type?: string; name?: string } }
          }
        }
      } & Rule.Node)
    | undefined

  if (definitionNode?.type !== "VariableDeclarator" || definitionNode.id?.type !== "Identifier") {
    return false
  }

  const typeAnnotation = definitionNode.id.typeAnnotation?.typeAnnotation
  if (!typeAnnotation) {
    return false
  }

  if (typeAnnotation.type === "TSStringKeyword") {
    return true
  }

  if (typeAnnotation.type === "TSTypeReference") {
    return (
      typeAnnotation.typeName?.type === "Identifier" &&
      (typeAnnotation.typeName.name === "String" || typeAnnotation.typeName.name === "string")
    )
  }

  return false
}

const noStringEquals: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Java-style String.equals(...) in JavaScript files. Use strict equality (===) instead.",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/no-string-equals.md",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      forbiddenStringEquals:
        "String.equals(...) is not standard JavaScript. Use strict equality (===) instead.",
      suggestStrictEquality: "Replace with {{replacement}}.",
    },
  },
  create: withSfccSettings((context) => {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      CallExpression(node: Rule.Node) {
        const callExpression = node as Rule.Node & {
          callee: Rule.Node & { type?: string; computed?: boolean; property?: Rule.Node }
          arguments?: Rule.Node[]
        }

        if (callExpression.callee?.type !== "MemberExpression") {
          return
        }

        const callee = callExpression.callee
        if (!callee.property || !isEqualsProperty(callee.property as Rule.Node)) {
          return
        }

        if (
          !shouldReportBasedOnTypes(context, callee as unknown as Rule.Node & { object: Rule.Node })
        ) {
          return
        }

        context.report({
          node: callExpression,
          messageId: "forbiddenStringEquals",
          suggest: getEqualitySuggestion(callExpression, context.sourceCode),
        })
      },
    }
  }),
}

export default noStringEquals
