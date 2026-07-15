import type { Rule } from "eslint"

type TypeLike = {
  types?: unknown[]
  value?: unknown
  isUnion?: () => boolean
  isStringLiteral?: () => boolean
}

type TypeCheckerLike = {
  getTypeAtLocation(node: unknown): unknown
  typeToString(type: unknown): string
}

type ProgramLike = {
  getTypeChecker(): TypeCheckerLike
}

type ParserServicesLike = {
  program?: ProgramLike
  esTreeNodeToTSNodeMap?: Map<unknown, unknown>
}

function getParserServices(context: Rule.RuleContext): ParserServicesLike | undefined {
  return (
    (context.sourceCode.parserServices as ParserServicesLike | undefined) ??
    (context as unknown as { parserServices?: ParserServicesLike }).parserServices ??
    undefined
  )
}

function getTypeForNode(context: Rule.RuleContext, node: Rule.Node): unknown {
  const parserServices = getParserServices(context)
  const program = parserServices?.program
  const tsNodeMap = parserServices?.esTreeNodeToTSNodeMap

  if (!program || !tsNodeMap) {
    return undefined
  }

  const tsNode = tsNodeMap.get(node)
  if (!tsNode) {
    return undefined
  }

  const checker = program.getTypeChecker()
  return checker.getTypeAtLocation(tsNode)
}

function getStringLiteralValuesFromType(type: unknown): string[] | undefined {
  const typeLike = type as TypeLike | undefined
  if (!typeLike) {
    return undefined
  }

  if (typeof typeLike.isStringLiteral === "function" && typeLike.isStringLiteral()) {
    return typeof typeLike.value === "string" ? [typeLike.value] : undefined
  }

  if (typeof typeLike.value === "string") {
    return [typeLike.value]
  }

  const unionTypes = Array.isArray(typeLike.types) ? typeLike.types : undefined
  const hasUnionTypesArray = unionTypes !== undefined && unionTypes.length > 0
  const isUnionType =
    (typeof typeLike.isUnion === "function" && typeLike.isUnion()) || hasUnionTypesArray

  if (!isUnionType || !hasUnionTypesArray) {
    return undefined
  }

  const values = unionTypes
    .map((part) => getStringLiteralValuesFromType(part))
    .flatMap((part) => part ?? [])

  if (values.length !== unionTypes.length) {
    return undefined
  }

  return [...new Set(values)]
}

function getUnionParts(type: unknown): unknown[] | undefined {
  const typeLike = type as TypeLike | undefined
  if (!typeLike) {
    return undefined
  }

  const unionTypes = Array.isArray(typeLike.types) ? typeLike.types : undefined
  const isUnionType =
    (typeof typeLike.isUnion === "function" && typeLike.isUnion()) ||
    (unionTypes !== undefined && unionTypes.length > 0)

  if (!isUnionType || !unionTypes || unionTypes.length === 0) {
    return undefined
  }

  return unionTypes
}

export function parseTypeWordsFromTypeText(typeText: string): string[] {
  return typeText
    .replace(/[()]/gu, "")
    .split(/[|&]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function isStringLiteralTypeText(typeText: string): boolean {
  return /^".*"$/u.test(typeText) || /^'.*'$/u.test(typeText)
}

export function isAmbiguousTypeWord(word: string): boolean {
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

export function isNullableTypeWord(word: string): boolean {
  return word === "null" || word === "undefined" || word === "void"
}

export function isStringLikeTypeWord(word: string): boolean {
  return word === "string" || word === "String" || isStringLiteralTypeText(word)
}

export function isArrayTypeWord(word: string): boolean {
  return /\[\]$|^Array<|^ReadonlyArray</u.test(word)
}

export function isObjectLikeTypeWord(word: string): boolean {
  return (
    /^\{.*\}$/u.test(word) || /^Record<.*>$/u.test(word) || word === "object" || word === "Object"
  )
}

export function hasStringLikeWithoutConcreteNonString(words: string[]): boolean {
  if (words.length === 0) {
    return false
  }

  const hasStringLike = words.some((word) => isStringLikeTypeWord(word))
  const hasNonString = words.some(
    (word) => !isStringLikeTypeWord(word) && !isAmbiguousTypeWord(word),
  )

  return hasStringLike && !hasNonString
}

export function getTypeTextForNode(context: Rule.RuleContext, node: Rule.Node): string | undefined {
  const type = getTypeForNode(context, node)
  if (!type) {
    return undefined
  }

  const parserServices = getParserServices(context)
  const checker = parserServices?.program?.getTypeChecker()
  if (!checker) {
    return undefined
  }

  return checker.typeToString(type)
}

export function getExactStringLiteralValuesForNode(
  context: Rule.RuleContext,
  node: Rule.Node,
): string[] | undefined {
  const type = getTypeForNode(context, node)
  if (!type) {
    return undefined
  }

  return getStringLiteralValuesFromType(type)
}

export function getUnionTypePartTextsForNode(
  context: Rule.RuleContext,
  node: Rule.Node,
): string[] | undefined {
  const type = getTypeForNode(context, node)
  if (!type) {
    return undefined
  }

  const parserServices = getParserServices(context)
  const checker = parserServices?.program?.getTypeChecker()
  if (!checker) {
    return undefined
  }

  const unionParts = getUnionParts(type)
  if (!unionParts) {
    return undefined
  }

  const texts = unionParts
    .map((part) => checker.typeToString(part).trim())
    .filter((part) => part.length > 0)

  return texts.length > 0 ? [...new Set(texts)] : undefined
}

export function getTypeWordsForNode(context: Rule.RuleContext, node: Rule.Node): string[] {
  const unionPartTexts = getUnionTypePartTextsForNode(context, node)
  if (unionPartTexts && unionPartTexts.length > 0) {
    return unionPartTexts
  }

  const typeText = getTypeTextForNode(context, node)
  if (!typeText) {
    return []
  }

  return parseTypeWordsFromTypeText(typeText)
}
