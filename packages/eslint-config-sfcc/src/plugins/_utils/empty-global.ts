import type { Rule } from "eslint"

import {
  findSfccAttributeDefinition,
  getSfccAttributeEmptySemantics,
  type SfccObjectMetadata,
} from "@commerce-klaus/sfcc-module-resolver/object-metadata"
import {
  getJSDocComment,
  parseComment,
  tryParse as parseJsdocType,
  type RootResult as JsdocTypeNode,
} from "@es-joy/jsdoccomment"

import type { SfccSettings } from "../../types/sfcc-settings.js"

import { getSfccObjectMetadata } from "./object-metadata.js"
import { getRuleCwd } from "./sfcc-settings.js"
import {
  getExactStringLiteralValuesForNode,
  getTypeDeclarationFilePathsForNode,
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
const DELIMITED_PARENT_TYPES = new Set([
  "ArrayExpression",
  "ArrowFunctionExpression",
  "AssignmentExpression",
  "AssignmentPattern",
  "CallExpression",
  "ConditionalExpression",
  "DoWhileStatement",
  "ExpressionStatement",
  "ForStatement",
  "IfStatement",
  "NewExpression",
  "Property",
  "ReturnStatement",
  "SequenceExpression",
  "SwitchCase",
  "SwitchStatement",
  "TemplateLiteral",
  "ThrowStatement",
  "VariableDeclarator",
  "WhileStatement",
])

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

  if (node.type === "MemberExpression") {
    return getStaticMemberPropertyName(node)
  }

  return undefined
}

function getStaticMemberPropertyName(node: Rule.Node): string | undefined {
  if (node.type !== "MemberExpression") {
    return undefined
  }

  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name
  }

  if (
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value
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

function findJsdocType(
  context: Rule.RuleContext,
  node: Rule.Node,
  tagName: "param" | "type",
  parameterName?: string,
): string | undefined {
  const comment = getJSDocComment(context.sourceCode, node, {
    minLines: 0,
    maxLines: 1,
  })
  if (!comment) {
    return undefined
  }

  const tag = parseComment(comment).tags.find(
    (candidate) =>
      candidate.tag === tagName &&
      (parameterName === undefined || candidate.name === parameterName),
  )
  return tag?.type ? normalizeJsdocType(tag.type) : undefined
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
    const variableDeclaration =
      definitionNode.parent?.type === "VariableDeclaration"
        ? (definitionNode.parent as Rule.Node)
        : definitionNode
    const declarationNode =
      variableDeclaration.parent?.type === "ExportNamedDeclaration"
        ? (variableDeclaration.parent as Rule.Node)
        : variableDeclaration
    return findJsdocType(context, declarationNode, "type")
  }

  if (definition.type === "Parameter") {
    const parameterName = definition.name?.type === "Identifier" ? definition.name.name : node.name
    return findJsdocType(context, definitionNode, "param", parameterName)
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
  sfccSettings?: SfccSettings,
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

  if (sfccSettings) {
    const metadataAnalysis = analyzeMetadataArgument(
      context,
      argument,
      getSfccObjectMetadata(sfccSettings, getRuleCwd(context)),
    )
    if (metadataAnalysis) {
      return metadataAnalysis
    }
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

  return { kind, nullable: true, typeText }
}

function analyzeMetadataArgument(
  context: Rule.RuleContext,
  argument: Rule.Node,
  metadata: SfccObjectMetadata,
): EmptyArgumentAnalysis | undefined {
  const reference = getMetadataAttributeReference(context, argument)
  if (!reference) {
    return undefined
  }

  const definition = findSfccAttributeDefinition(
    metadata,
    reference.objectTypeId,
    reference.attributeId,
  )
  if (!definition) {
    return undefined
  }

  const semantics = getSfccAttributeEmptySemantics(definition)
  if (!semantics) {
    return undefined
  }

  return {
    kind: semantics,
    nullable: true,
    typeText: `${reference.objectTypeId}.${reference.attributeId} metadata (${definition.type})`,
  }
}

function getMetadataAttributeReference(
  context: Rule.RuleContext,
  argument: Rule.Node,
): { objectTypeId: string; attributeId: string } | undefined {
  if (argument.type === "CallExpression" && argument.callee.type === "MemberExpression") {
    const callee = asRuleNode(argument.callee)
    const receiver = asRuleNode(argument.callee.object)
    const preferenceNameNode = asRuleNode(argument.arguments?.[0])
    const methodName = callee ? getStaticMemberPropertyName(callee) : undefined
    const preferenceName = preferenceNameNode ? getStaticStringValue(preferenceNameNode) : undefined
    if (
      methodName === "getCustomPreferenceValue" &&
      preferenceName &&
      receiver &&
      isSiteExpression(context, receiver)
    ) {
      return { objectTypeId: "SitePreferences", attributeId: preferenceName }
    }
  }

  if (argument.type !== "MemberExpression") {
    return undefined
  }

  const attributeId = getStaticMemberPropertyName(argument)
  const customAccess = asRuleNode(argument.object)
  if (
    !attributeId ||
    customAccess?.type !== "MemberExpression" ||
    getStaticMemberPropertyName(customAccess) !== "custom"
  ) {
    return undefined
  }

  const receiver = asRuleNode(customAccess.object)
  if (!receiver) {
    return undefined
  }

  const objectTypeIds = getTypeWordsForNode(context, receiver)
    .filter((word) => !isNullableTypeWord(word))
    .map(toMetadataObjectTypeId)
    .filter((typeId): typeId is string => typeId !== undefined)
  const declarationFilePaths = getTypeDeclarationFilePathsForNode(context, receiver)
  const sfccObjectTypeIds = objectTypeIds.filter((typeId) =>
    declarationFilePaths.some((filePath) => isSfccTypeDeclaration(filePath, typeId)),
  )
  const jsdocObjectTypeId = getExplicitSfccObjectTypeIdFromJsdoc(
    getJsdocTypeForIdentifier(context, receiver),
  )

  if (new Set(sfccObjectTypeIds).size === 1) {
    return { objectTypeId: sfccObjectTypeIds[0]!, attributeId }
  }

  return jsdocObjectTypeId ? { objectTypeId: jsdocObjectTypeId, attributeId } : undefined
}

function isSiteExpression(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (isSfccModuleRequire(node, "dw/system/Site")) {
    return true
  }

  const typeIds = getTypeWordsForNode(context, node)
    .map(toMetadataObjectTypeId)
    .filter((typeId): typeId is string => typeId !== undefined)
  const declarationFilePaths = getTypeDeclarationFilePathsForNode(context, node)
  if (
    typeIds.some(
      (typeId) =>
        typeId === "Site" &&
        declarationFilePaths.some((filePath) => isSfccTypeDeclaration(filePath, typeId)),
    )
  ) {
    return true
  }

  if (node.type === "Identifier") {
    return (
      isIdentifierBoundToSfccModule(context, node, "dw/system/Site") ||
      getExplicitSfccObjectTypeIdFromJsdoc(getJsdocTypeForIdentifier(context, node)) === "Site"
    )
  }

  if (node.type === "MemberExpression") {
    const object = asRuleNode(node.object)
    return object ? isSiteExpression(context, object) : false
  }

  if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
    const object = asRuleNode(node.callee.object)
    return object ? isSiteExpression(context, object) : false
  }

  return false
}

function getExplicitSfccObjectTypeIdFromJsdoc(typeText: string | undefined): string | undefined {
  if (!typeText) {
    return undefined
  }

  let parsedType: JsdocTypeNode
  try {
    parsedType = parseJsdocType(typeText)
  } catch (error) {
    if (error instanceof Error) {
      return undefined
    }
    throw error
  }

  const typeIds = getExplicitSfccObjectTypeIds(parsedType)
  return typeIds && new Set(typeIds).size === 1 ? typeIds[0] : undefined
}

function getExplicitSfccObjectTypeIds(node: JsdocTypeNode): string[] | undefined {
  if (
    node.type === "JsdocTypeNullable" ||
    node.type === "JsdocTypeNotNullable" ||
    node.type === "JsdocTypeOptional" ||
    node.type === "JsdocTypeParenthesis"
  ) {
    return getExplicitSfccObjectTypeIds(node.element)
  }

  if (node.type === "JsdocTypeUnion") {
    const valueTypes = node.elements.filter(
      (element) => element.type !== "JsdocTypeNull" && element.type !== "JsdocTypeUndefined",
    )
    const typeIds = valueTypes.flatMap((element) => getExplicitSfccObjectTypeIds(element) ?? [])
    return typeIds.length === valueTypes.length ? typeIds : undefined
  }

  if (node.type === "JsdocTypeImport") {
    const pathParts = node.element.value.split("/")
    return pathParts[0] === "dw" && pathParts.length >= 3 ? [pathParts.at(-1)!] : undefined
  }

  const nameParts = getJsdocNamePathParts(node)
  return nameParts?.[0] === "dw" && nameParts.length >= 3 ? [nameParts.at(-1)!] : undefined
}

function getJsdocNamePathParts(node: JsdocTypeNode): string[] | undefined {
  if (node.type === "JsdocTypeName") {
    return [node.value]
  }

  if (node.type !== "JsdocTypeNamePath" || node.right.type !== "JsdocTypeProperty") {
    return undefined
  }

  const leftParts = getJsdocNamePathParts(node.left)
  return leftParts ? [...leftParts, node.right.value] : undefined
}

function toMetadataObjectTypeId(typeWord: string): string | undefined {
  const normalized = typeWord
    .replace(/^typeof\s+/u, "")
    .replace(/<.*>$/u, "")
    .trim()
  const match = /(?:^|\.)([A-Za-z_$][\w$]*)$/u.exec(normalized)
  return match?.[1]
}

function getStaticStringValue(node: Rule.Node | undefined): string | undefined {
  return node?.type === "Literal" && typeof node.value === "string" ? node.value : undefined
}

function isIdentifierBoundToSfccModule(
  context: Rule.RuleContext,
  node: Rule.Node & { type: "Identifier" },
  moduleId: string,
): boolean {
  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const definitionNode = reference?.resolved?.defs?.[0]?.node as
    | (Rule.Node & { init?: unknown })
    | undefined
  return isSfccModuleRequire(asRuleNode(definitionNode?.init), moduleId)
}

function isSfccModuleRequire(node: Rule.Node | undefined, moduleId: string): boolean {
  if (
    node?.type !== "CallExpression" ||
    node.callee.type !== "Identifier" ||
    node.callee.name !== "require"
  ) {
    return false
  }

  return getStaticStringValue(asRuleNode(node.arguments?.[0])) === moduleId
}

function isSfccTypeDeclaration(filePath: string, typeId: string): boolean {
  const normalizedPath = filePath.replaceAll("\\", "/")
  return normalizedPath.includes("/types/dw/") && normalizedPath.endsWith(`/${typeId}.d.ts`)
}

function asRuleNode(value: unknown): Rule.Node | undefined {
  return typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string"
    ? (value as Rule.Node)
    : undefined
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

export function canAutofixEmptyReplacement(
  analysis: Exclude<EmptyArgumentAnalysis, { kind: "ambiguous" }>,
  argument: Rule.Node,
): boolean {
  if (
    analysis.kind === "always-empty" ||
    (analysis.kind === "nullish-only" && !analysis.nullable)
  ) {
    return false
  }

  if (argument.type === "Identifier" || argument.type === "Literal") {
    return true
  }

  if (analysis.nullable) {
    return false
  }

  return [
    "ArrayExpression",
    "CallExpression",
    "MemberExpression",
    "NewExpression",
    "TemplateLiteral",
  ].includes(argument.type)
}

export function canSuggestEmptyReplacement(
  analysis: Exclude<EmptyArgumentAnalysis, { kind: "ambiguous" }>,
  argument: Rule.Node,
): boolean {
  if (
    analysis.kind === "always-empty" ||
    (analysis.kind === "nullish-only" && !analysis.nullable)
  ) {
    return (
      argument.type === "Identifier" ||
      argument.type === "Literal" ||
      (argument.type === "ObjectExpression" &&
        (argument as Rule.Node & { properties?: Rule.Node[] }).properties?.length === 0)
    )
  }

  return canAutofixEmptyReplacement(analysis, argument)
}

export function getContextualEmptyReplacement(
  callExpression: Rule.Node,
  replacement: string,
): string {
  const parentType = callExpression.parent?.type
  if (
    !parentType ||
    DELIMITED_PARENT_TYPES.has(parentType) ||
    (parentType === "LogicalExpression" && !replacement.includes(" || "))
  ) {
    return replacement
  }

  return `(${replacement})`
}
