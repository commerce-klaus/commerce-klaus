import type { Rule } from "eslint"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import { getTypeTextForNode } from "../_utils/type-aware.js"

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

type ReferenceSuggestionKind = "length" | "object-keys" | "collection" | "nullable" | "unknown"

function isJavaScriptTarget(filename: string): boolean {
  if (filename === "<input>") {
    return true
  }

  return /\.(?:[cm]?(?:js|ts)|ds)$/iu.test(filename)
}

function parseTypeWords(typeText: string): string[] {
  return typeText
    .replace(/[()]/gu, "")
    .split(/[|&]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isStringLiteralTypeText(typeText: string): boolean {
  return /^".*"$/u.test(typeText) || /^'.*'$/u.test(typeText)
}

function inferSuggestionKindFromTypeText(typeText: string): ReferenceSuggestionKind {
  const words = parseTypeWords(typeText)
  const hasNullable = words.some(
    (word) => word === "null" || word === "undefined" || word === "void",
  )
  const isObjectLike = /^\{|\bobject\b|\bObject\b|\bRecord</u.test(typeText)
  const isStringLike = words.some(
    (word) => word === "string" || word === "String" || isStringLiteralTypeText(word),
  )
  const isArrayLike = /\[\]|\bArray<|\bReadonlyArray</u.test(typeText)
  const isCollectionLike =
    /\b(?:ArrayList|Collection|FilteringCollection|HashSet|LinkedHashSet|List|Set|SortedSet)\b/u.test(
      typeText,
    )

  if (isCollectionLike) {
    return "collection"
  }

  if (isStringLike || isArrayLike) {
    return "length"
  }

  if (isObjectLike) {
    return "object-keys"
  }

  if (hasNullable) {
    return "nullable"
  }

  return "unknown"
}

function getTypeAwareSuggestionKind(
  context: Rule.RuleContext,
  argument: Rule.Node,
): ReferenceSuggestionKind {
  const typeText = getTypeTextForNode(context, argument)
  if (!typeText) {
    return "unknown"
  }

  return inferSuggestionKindFromTypeText(typeText)
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

function isIdentifierOrMemberExpression(node: Rule.Node): boolean {
  if (node.type === "Identifier") {
    return true
  }

  if (node.type === "MemberExpression") {
    return true
  }

  return false
}

function isStringInitializedIdentifier(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "Identifier") {
    return false
  }

  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const resolved = reference?.resolved
  const definitionNode = resolved?.defs?.[0]?.node as
    | ({
        type?: string
        init?: Rule.Node
      } & Rule.Node)
    | undefined

  if (definitionNode?.type !== "VariableDeclarator") {
    return false
  }

  const initializer = definitionNode.init
  if (!initializer) {
    return false
  }

  if (initializer.type === "Literal" && typeof initializer.value === "string") {
    return true
  }

  if (initializer.type === "TemplateLiteral" && initializer.expressions.length === 0) {
    return true
  }

  return false
}

function isGlobalReference(
  context: Rule.RuleContext,
  node: Rule.Node & { type: "Identifier"; name: string },
): boolean {
  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const resolved = reference?.resolved

  if (!resolved) {
    return true
  }

  if (resolved.scope.type !== "global") {
    return false
  }

  if (resolved.defs.length === 0) {
    return true
  }

  return resolved.defs.every((definition) => {
    const definitionWithNode = definition as { node?: unknown }
    return definitionWithNode.node == null
  })
}

function getEmptySuggestions(
  context: Rule.RuleContext,
  argument: Rule.Node,
  callExpression: Rule.Node,
  sourceCode: { getText(node: Rule.Node): string },
) {
  const text = sourceCode.getText(argument)

  const buildSuggestion = (messageId: string, replacement: string) => ({
    messageId,
    data: { replacement },
    fix: (fixer: Rule.RuleFixer) => fixer.replaceText(callExpression, replacement),
  })

  if (argument.type === "Literal" && typeof argument.value === "string") {
    return [buildSuggestion("suggestLengthCheck", `${text}.length === 0`)]
  }

  if (argument.type === "TemplateLiteral" && argument.expressions.length === 0) {
    return [buildSuggestion("suggestLengthCheck", `${text}.length === 0`)]
  }

  if (argument.type === "ArrayExpression") {
    return [buildSuggestion("suggestLengthCheck", `${text}.length === 0`)]
  }

  if (argument.type === "ObjectExpression") {
    return [buildSuggestion("suggestObjectKeysCheck", `Object.keys(${text}).length === 0`)]
  }

  if (argument.type === "NewExpression") {
    const calleeName = getPropertyName(argument.callee as Rule.Node)
    if (calleeName && COLLECTION_CONSTRUCTORS.has(calleeName)) {
      return [buildSuggestion("suggestCollectionCheck", `${text}.isEmpty()`)]
    }
  }

  if (isIdentifierOrMemberExpression(argument)) {
    if (isStringInitializedIdentifier(context, argument)) {
      return [buildSuggestion("suggestLengthCheck", `${text}.length === 0`)]
    }

    const typeAwareSuggestionKind = getTypeAwareSuggestionKind(context, argument)

    if (typeAwareSuggestionKind === "nullable") {
      return [buildSuggestion("suggestNullableReferenceCheck", `!${text}`)]
    }

    if (typeAwareSuggestionKind === "length") {
      return [buildSuggestion("suggestLengthCheck", `${text}.length === 0`)]
    }

    if (typeAwareSuggestionKind === "object-keys") {
      return [buildSuggestion("suggestObjectKeysCheck", `Object.keys(${text}).length === 0`)]
    }

    if (typeAwareSuggestionKind === "collection") {
      return [buildSuggestion("suggestCollectionCheck", `${text}.isEmpty()`)]
    }

    return [
      buildSuggestion("suggestNullableReferenceCheck", `!${text}`),
      buildSuggestion("suggestLengthCheck", `${text}.length === 0`),
      buildSuggestion("suggestObjectKeysCheck", `Object.keys(${text}).length === 0`),
      buildSuggestion("suggestCollectionCheck", `${text}.isEmpty()`),
    ]
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
      suggestNullableReferenceCheck:
        "Use {{replacement}} instead for a null or nullable object reference.",
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

        if (!isGlobalReference(context, callExpression.callee)) {
          return
        }

        const argument = callExpression.arguments?.[0]
        if (!argument) {
          context.report({ node: callExpression.callee, messageId: "forbiddenEmptyGlobal" })
          return
        }

        context.report({
          node: callExpression,
          messageId: "forbiddenEmptyGlobal",
          suggest: getEmptySuggestions(context, argument, callExpression, context.sourceCode),
        })
      },
    }
  }),
}

export default noEmptyGlobal
