import type { Rule } from "eslint"

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

export function getTypeTextForNode(context: Rule.RuleContext, node: Rule.Node): string | undefined {
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
  const type = checker.getTypeAtLocation(tsNode)

  return checker.typeToString(type)
}
