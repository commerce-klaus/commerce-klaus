import type { Rule } from "eslint"

import {
  getExactStringLiteralValuesForNode,
  getTypeTextForNode,
  getTypeWordsForNode,
  isArrayTypeWord,
  isNullableTypeWord,
  isObjectLikeTypeWord,
  isStringLikeTypeWord,
  parseTypeWordsFromTypeText,
} from "./type-aware.js"

const COLLECTION_TYPE_PATTERN =
  /^(?:(?:dw\.util\.)?(?:ArrayList|Collection|FilteringCollection|HashSet|LinkedHashSet|List|SortedSet)|dw\.util\.Set)(?:<.*>)?$/u
const NATIVE_SET_TYPE_PATTERN = /^Set(?:<.*>)?$/u
const KNOWN_NON_EMPTY_PRIMITIVES = new Set([
  "bigint",
  "boolean",
  "Boolean",
  "number",
  "Number",
  "symbol",
  "Symbol",
])
const AMBIGUOUS_TYPE_WORDS = new Set(["any", "unknown", "never", "{}", "object", "Object"])

export type EmptyArgumentAnalysis =
  | {
      kind: "length" | "collection" | "nullish-only" | "always-empty"
      nullable: boolean
      typeText?: string
    }
  | {
      kind: "ambiguous"
      reason: "mixed" | "unknown"
      typeText?: string
    }

export type EmptyCallExpression = Rule.Node & {
  type: "CallExpression"
  arguments?: Rule.Node[]
  callee: Rule.Node & { type?: string; name?: string }
}

export function isJavaScriptTarget(filename: string): boolean {
  if (filename === "<input>") {
    return true
  }

  return /\.(?:[cm]?(?:js|ts)|ds)$/iu.test(filename)
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

export function asGlobalEmptyCall(
  context: Rule.RuleContext,
  node: Rule.Node,
): EmptyCallExpression | undefined {
  if (node.type !== "CallExpression") {
    return undefined
  }

  const callExpression = node as EmptyCallExpression
  if (
    callExpression.callee.type !== "Identifier" ||
    callExpression.callee.name !== "empty" ||
    !isGlobalReference(context, callExpression.callee)
  ) {
    return undefined
  }

  return callExpression
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

function isStringInitializedIdentifier(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "Identifier") {
    return false
  }

  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const definitionNode = reference?.resolved?.defs?.[0]?.node as
    | (Rule.Node & {
        type?: string
        init?: Rule.Node
        parent?: { type?: string; kind?: string }
      })
    | undefined

  if (
    definitionNode?.type !== "VariableDeclarator" ||
    definitionNode.parent?.type !== "VariableDeclaration" ||
    definitionNode.parent.kind !== "const"
  ) {
    return false
  }

  const initializer = definitionNode.init
  return (
    (initializer?.type === "Literal" && typeof initializer.value === "string") ||
    initializer?.type === "TemplateLiteral"
  )
}

function normalizeJsdocType(typeText: string): string {
  let normalized = typeText.trim()

  if (normalized.startsWith("?")) {
    normalized = `${normalized.slice(1)} | null`
  } else if (normalized.startsWith("!")) {
    normalized = normalized.slice(1)
  }

  if (normalized.endsWith("=")) {
    normalized = `${normalized.slice(0, -1)} | undefined`
  }

  return normalized === "*" ? "any" : normalized
}

function findJsdocType(comments: string[], pattern: RegExp): string | undefined {
  for (const comment of comments.toReversed()) {
    const match = pattern.exec(comment)
    if (match?.[1]) {
      return normalizeJsdocType(match[1])
    }
  }

  return undefined
}

function getCommentValuesBefore(context: Rule.RuleContext, node: Rule.Node): string[] {
  return context.sourceCode
    .getCommentsBefore(node)
    .filter((comment) => comment.type === "Block" && comment.value.startsWith("*"))
    .map((comment) => comment.value)
}

function getJsdocTypeForIdentifier(context: Rule.RuleContext, node: Rule.Node): string | undefined {
  if (node.type !== "Identifier") {
    return undefined
  }

  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const definition = reference?.resolved?.defs?.[0] as
    | {
        type?: string
        node?: Rule.Node
        name?: Rule.Node
      }
    | undefined
  const definitionNode = definition?.node
  if (!definitionNode) {
    return undefined
  }

  if (definition.type === "Variable") {
    const declarationNode =
      definitionNode.parent?.type === "VariableDeclaration"
        ? (definitionNode.parent as Rule.Node)
        : definitionNode
    return findJsdocType(getCommentValuesBefore(context, declarationNode), /@type\s*\{([^}]+)\}/u)
  }

  if (definition.type === "Parameter") {
    const parameterName = definition.name?.type === "Identifier" ? definition.name.name : node.name
    const escapedName = parameterName.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")
    return findJsdocType(
      getCommentValuesBefore(context, definitionNode),
      new RegExp(`@param\\s*\\{([^}]+)\\}\\s*(?:\\[)?${escapedName}(?:[=\\]])?`, "u"),
    )
  }

  return undefined
}

function classifyTypeWord(word: string): "length" | "collection" | "nullish-only" | "ambiguous" {
  if (AMBIGUOUS_TYPE_WORDS.has(word) || NATIVE_SET_TYPE_PATTERN.test(word)) {
    return "ambiguous"
  }

  if (
    isStringLikeTypeWord(word) ||
    isArrayTypeWord(word) ||
    word.startsWith("Array.<") ||
    /^\[.*\]$/u.test(word) ||
    /^readonly \[.*\]$/u.test(word)
  ) {
    return "length"
  }

  if (COLLECTION_TYPE_PATTERN.test(word)) {
    return "collection"
  }

  if (
    isObjectLikeTypeWord(word) ||
    KNOWN_NON_EMPTY_PRIMITIVES.has(word) ||
    /^[A-Za-z_$][\w$.]*(?:<.*>)?$/u.test(word)
  ) {
    return "nullish-only"
  }

  return "ambiguous"
}

export function analyzeEmptyArgument(
  context: Rule.RuleContext,
  argument: Rule.Node,
): EmptyArgumentAnalysis {
  if (argument.type === "Literal") {
    if (argument.value === null) {
      return { kind: "always-empty", nullable: true, typeText: "null" }
    }

    if (typeof argument.value === "string") {
      return { kind: "length", nullable: false, typeText: "string" }
    }

    return { kind: "nullish-only", nullable: false, typeText: typeof argument.value }
  }

  if (argument.type === "TemplateLiteral" || argument.type === "ArrayExpression") {
    return { kind: "length", nullable: false }
  }

  if (argument.type === "ObjectExpression") {
    return { kind: "nullish-only", nullable: false, typeText: "object" }
  }

  if (argument.type === "NewExpression") {
    const calleeName = getPropertyName(argument.callee as Rule.Node)
    if (calleeName && COLLECTION_TYPE_PATTERN.test(calleeName)) {
      return { kind: "collection", nullable: false, typeText: calleeName }
    }
  }

  if (isStringInitializedIdentifier(context, argument)) {
    return { kind: "length", nullable: false, typeText: "string" }
  }

  const exactStringLiterals = getExactStringLiteralValuesForNode(context, argument)
  if (exactStringLiterals && exactStringLiterals.length > 0) {
    return { kind: "length", nullable: false, typeText: getTypeTextForNode(context, argument) }
  }

  const parserTypeWords = getTypeWordsForNode(context, argument)
  const parserTypeText = getTypeTextForNode(context, argument)
  const jsdocTypeText = getJsdocTypeForIdentifier(context, argument)
  const typeText = parserTypeText ?? jsdocTypeText
  const words =
    parserTypeWords.length > 0
      ? parserTypeWords
      : jsdocTypeText
        ? parseTypeWordsFromTypeText(jsdocTypeText)
        : []
  if (words.length === 0) {
    return { kind: "ambiguous", reason: "unknown", typeText }
  }

  const nullable = words.some((word) => isNullableTypeWord(word))
  const valueWords = words.filter((word) => !isNullableTypeWord(word))
  if (valueWords.length === 0) {
    return { kind: "always-empty", nullable: true, typeText }
  }

  const categories = new Set(valueWords.map((word) => classifyTypeWord(word)))
  if (categories.has("ambiguous")) {
    return { kind: "ambiguous", reason: "unknown", typeText }
  }

  if (categories.size !== 1) {
    return { kind: "ambiguous", reason: "mixed", typeText }
  }

  const kind = [...categories][0]
  if (!kind || kind === "ambiguous") {
    return { kind: "ambiguous", reason: "unknown", typeText }
  }

  return { kind, nullable, typeText }
}

function nullishCheck(text: string): string {
  return `${text} === null || ${text} === undefined`
}

export function buildExplicitEmptyReplacement(
  analysis: Exclude<EmptyArgumentAnalysis, { kind: "ambiguous" }>,
  text: string,
): string {
  if (analysis.kind === "always-empty") {
    return "true"
  }

  if (analysis.kind === "nullish-only") {
    return analysis.nullable ? nullishCheck(text) : "false"
  }

  const valueCheck = analysis.kind === "length" ? `${text}.length === 0` : `${text}.isEmpty()`

  return analysis.nullable ? `${nullishCheck(text)} || ${valueCheck}` : valueCheck
}
