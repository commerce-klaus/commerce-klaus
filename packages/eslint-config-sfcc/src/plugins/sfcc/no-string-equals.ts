import type { Rule } from "eslint"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import {
  getExactStringLiteralValuesForNode,
  getTypeTextForNode,
  getUnionTypePartTextsForNode,
  isStringLiteralTypeText,
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
  callExpression: Rule.Node & { callee: Rule.Node; arguments?: Rule.Node[] },
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

function isAmbiguousTypeWord(word: string): boolean {
  return (
    word === "any" ||
    word === "unknown" ||
    word === "never" ||
    word === "{}" ||
    word === "object" ||
    word === "Object" ||
    word === "null" ||
    word === "undefined" ||
    word === "void"
  )
}

function isStringLikeTypeWord(word: string): boolean {
  return word === "string" || word === "String" || isStringLiteralTypeText(word)
}

function hasStringLikeWithoutConcreteNonString(words: string[]): boolean {
  if (words.length === 0) {
    return false
  }

  const hasStringLike = words.some((word) => isStringLikeTypeWord(word))
  const hasNonString = words.some(
    (word) => !isStringLikeTypeWord(word) && !isAmbiguousTypeWord(word),
  )

  return hasStringLike && !hasNonString
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

  const unionPartTexts = getUnionTypePartTextsForNode(context, memberExpression.object)
  if (unionPartTexts && unionPartTexts.length > 0) {
    if (hasStringLikeWithoutConcreteNonString(unionPartTexts)) {
      return true
    }

    if (unionPartTexts.some((word) => isAmbiguousTypeWord(word))) {
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
