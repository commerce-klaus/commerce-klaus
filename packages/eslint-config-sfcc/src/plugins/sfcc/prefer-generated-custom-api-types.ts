import type { Rule } from "eslint"

import {
  findOperationByOperationId,
  getRequiredCustomApiExportsForScriptFile,
  loadOasDocument,
  resolveOasRequestBody,
} from "@commerce-klaus/sfcc-module-resolver/custom-apis"

import {
  type ProgramNode,
  createGeneratedTypeSuggestion,
  findExportedFunction,
  getTypeComment,
} from "../_utils/generated-function-types.ts"
import { getRequiredModulePath } from "../_utils/static-module.ts"

function getParent(node: Rule.Node): Rule.Node | undefined {
  return (node as Rule.Node & { parent?: Rule.Node }).parent
}

function isInsideFunction(node: Rule.Node, functionNode: Rule.Node): boolean {
  let current = getParent(node)
  while (current) {
    if (current === functionNode) {
      return true
    }
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return false
    }
    current = getParent(current)
  }
  return false
}

function isRestResponseMgrCreateSuccess(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (
    node.type !== "CallExpression" ||
    node.callee.type !== "MemberExpression" ||
    node.callee.computed ||
    node.callee.object.type !== "Identifier" ||
    node.callee.property.type !== "Identifier" ||
    node.callee.property.name !== "createSuccess"
  ) {
    return false
  }

  const responseManager = node.callee.object
  const scope = context.sourceCode.getScope(responseManager)
  const reference = scope.references.find((item) => item.identifier === responseManager)
  const definitionNode = reference?.resolved?.defs[0]?.node as
    | (Rule.Node & { init?: Rule.Node })
    | undefined
  return (
    definitionNode?.type === "VariableDeclarator" &&
    definitionNode.init !== undefined &&
    getRequiredModulePath(definitionNode.init) === "dw/system/RESTResponseMgr"
  )
}

function getLocalVariableDeclaration(
  context: Rule.RuleContext,
  identifier: Rule.Node,
): Rule.Node | undefined {
  if (identifier.type !== "Identifier") {
    return undefined
  }

  const scope = context.sourceCode.getScope(identifier)
  const reference = scope.references.find((item) => item.identifier === identifier)
  const definitionNode = reference?.resolved?.defs[0]?.node as Rule.Node | undefined
  const declaration = definitionNode && getParent(definitionNode)
  if (
    definitionNode?.type !== "VariableDeclarator" ||
    declaration?.type !== "VariableDeclaration" ||
    declaration.declarations.length !== 1
  ) {
    return undefined
  }

  return declaration
}

function getStaticPropertyName(node: Rule.Node): string | undefined {
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name
  }

  if (
    node.type === "MemberExpression" &&
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value
  }

  return undefined
}

function isGlobalIdentifier(context: Rule.RuleContext, node: Rule.Node, name: string): boolean {
  if (node.type !== "Identifier" || node.name !== name) {
    return false
  }

  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  return !reference?.resolved || reference.resolved.scope.type === "global"
}

function isRequestBodyMember(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "MemberExpression" || getStaticPropertyName(node) !== "requestBodyAsString") {
    return false
  }

  const parameterMap = node.object as Rule.Node
  return (
    parameterMap.type === "MemberExpression" &&
    getStaticPropertyName(parameterMap) === "httpParameterMap" &&
    isGlobalIdentifier(context, parameterMap.object as Rule.Node, "request")
  )
}

function isRequestBodySource(
  context: Rule.RuleContext,
  node: Rule.Node,
  visited = new Set<Rule.Node>(),
): boolean {
  if (visited.has(node)) {
    return false
  }
  visited.add(node)

  if (isRequestBodyMember(context, node)) {
    return true
  }

  if (node.type === "LogicalExpression") {
    return (
      isRequestBodySource(context, node.left as Rule.Node, visited) ||
      isRequestBodySource(context, node.right as Rule.Node, visited)
    )
  }

  if (node.type !== "Identifier") {
    return false
  }

  const scope = context.sourceCode.getScope(node)
  const reference = scope.references.find((item) => item.identifier === node)
  const definitionNode = reference?.resolved?.defs[0]?.node as
    | (Rule.Node & { init?: Rule.Node })
    | undefined
  return (
    definitionNode?.type === "VariableDeclarator" &&
    definitionNode.init !== undefined &&
    isRequestBodySource(context, definitionNode.init, visited)
  )
}

function isRequestBodyJsonParse(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (
    node.type !== "CallExpression" ||
    node.callee.type !== "MemberExpression" ||
    getStaticPropertyName(node.callee as Rule.Node) !== "parse" ||
    !isGlobalIdentifier(context, node.callee.object as Rule.Node, "JSON")
  ) {
    return false
  }

  const argument = node.arguments[0] as Rule.Node | undefined
  return argument !== undefined && isRequestBodySource(context, argument)
}

function getParsedRequestBodyDeclaration(
  context: Rule.RuleContext,
  call: Rule.Node,
): Rule.Node | undefined {
  const parent = getParent(call)
  if (parent?.type === "VariableDeclarator") {
    const identifier = (parent as Rule.Node & { id?: Rule.Node }).id
    const declaration = getParent(parent)
    return identifier?.type === "Identifier" && declaration?.type === "VariableDeclaration"
      ? declaration
      : undefined
  }

  if (parent?.type !== "AssignmentExpression") {
    return undefined
  }

  const assignment = parent as Rule.Node & { left: Rule.Node; right: Rule.Node }
  return assignment.right === call
    ? getLocalVariableDeclaration(context, assignment.left)
    : undefined
}

function includesGeneratedTypeConstituent(actualType: string, generatedType: string): boolean {
  let searchFrom = 0
  while (searchFrom < actualType.length) {
    const index = actualType.indexOf(generatedType, searchFrom)
    if (index === -1) {
      return false
    }

    const previous = actualType.slice(0, index).trimEnd().at(-1)
    const next = actualType
      .slice(index + generatedType.length)
      .trimStart()
      .at(0)
    const validPrevious =
      previous === undefined || previous === "(" || previous === "&" || previous === "|"
    const validNext = next === undefined || next === ")" || next === "&" || next === "|"
    if (validPrevious && validNext) {
      return true
    }

    searchFrom = index + generatedType.length
  }

  return false
}

const preferGeneratedCustomApiTypes: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Requires Custom API handlers and local success response values to use their generated SfccCustomApis operation types.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-generated-custom-api-types",
      recommended: false,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      missingGeneratedType:
        'Custom API handler "{{exportName}}" should use its generated type "{{expectedType}}".',
      incorrectGeneratedType:
        'Custom API handler "{{exportName}}" uses "{{actualType}}" instead of its generated type "{{expectedType}}".',
      missingGeneratedResponseType:
        'Custom API success response should use its generated type "{{expectedType}}".',
      incorrectGeneratedResponseType:
        'Custom API success response uses "{{actualType}}" instead of its generated type "{{expectedType}}".',
      missingGeneratedRequestBodyType:
        'Parsed Custom API request body should use its generated type "{{expectedType}}".',
      incorrectGeneratedRequestBodyType:
        'Parsed Custom API request body uses "{{actualType}}" instead of its generated type "{{expectedType}}".',
      useGeneratedType: 'Use the generated type "{{expectedType}}".',
    },
  },
  create(context) {
    const requestBodyParseCalls: Rule.Node[] = []
    const successCalls: Rule.Node[] = []

    return {
      CallExpression(node) {
        const ruleNode = node as unknown as Rule.Node
        if (isRestResponseMgrCreateSuccess(context, ruleNode)) {
          successCalls.push(ruleNode)
        }
        if (isRequestBodyJsonParse(context, ruleNode)) {
          requestBodyParseCalls.push(ruleNode)
        }
      },
      "Program:exit"(node) {
        const program = node as unknown as ProgramNode
        for (const { operationId, schemaPath } of getRequiredCustomApiExportsForScriptFile(
          context.filename,
        )) {
          const exportedFunction = findExportedFunction(program, operationId)
          if (!exportedFunction) {
            continue
          }

          const { annotationTarget: target, functionNode } = exportedFunction
          const expectedType = `SfccCustomApis.Operations[${JSON.stringify(operationId)}]["Handler"]`
          const typeComment = getTypeComment(context, target)
          if (typeComment?.type !== expectedType) {
            context.report({
              node: target,
              messageId: typeComment ? "incorrectGeneratedType" : "missingGeneratedType",
              data: {
                actualType: typeComment?.type ?? "",
                expectedType,
                exportName: operationId,
              },
              suggest: [createGeneratedTypeSuggestion(context, target, expectedType, typeComment)],
            })
          }

          if (!functionNode) {
            continue
          }

          const document = loadOasDocument(schemaPath)
          const operation = document
            ? findOperationByOperationId(document, operationId)?.operation
            : undefined
          const hasRequestBody =
            document && resolveOasRequestBody(operation?.requestBody, document) !== undefined
          const reportedDeclarations = new Set<Rule.Node>()
          if (hasRequestBody) {
            for (const call of requestBodyParseCalls) {
              if (!isInsideFunction(call, functionNode)) {
                continue
              }

              const declaration = getParsedRequestBodyDeclaration(context, call)
              if (!declaration || reportedDeclarations.has(declaration)) {
                continue
              }

              const requestBodyType = `SfccCustomApis.Operations[${JSON.stringify(operationId)}]["RequestBody"]`
              const requestBodyTypeComment = getTypeComment(context, declaration)
              if (
                requestBodyTypeComment &&
                includesGeneratedTypeConstituent(requestBodyTypeComment.type, requestBodyType)
              ) {
                continue
              }

              reportedDeclarations.add(declaration)
              context.report({
                node: declaration,
                messageId: requestBodyTypeComment
                  ? "incorrectGeneratedRequestBodyType"
                  : "missingGeneratedRequestBodyType",
                data: {
                  actualType: requestBodyTypeComment?.type ?? "",
                  expectedType: requestBodyType,
                },
                suggest: [
                  createGeneratedTypeSuggestion(
                    context,
                    declaration,
                    requestBodyType,
                    requestBodyTypeComment,
                  ),
                ],
              })
            }
          }

          for (const call of successCalls) {
            if (!isInsideFunction(call, functionNode) || call.type !== "CallExpression") {
              continue
            }

            const argument = call.arguments[0] as Rule.Node | undefined
            const declaration = argument && getLocalVariableDeclaration(context, argument)
            if (!declaration || reportedDeclarations.has(declaration)) {
              continue
            }

            const responseType = `SfccCustomApis.Operations[${JSON.stringify(operationId)}]["Response"]`
            const responseTypeComment = getTypeComment(context, declaration)
            if (
              responseTypeComment &&
              includesGeneratedTypeConstituent(responseTypeComment.type, responseType)
            ) {
              continue
            }

            reportedDeclarations.add(declaration)
            context.report({
              node: declaration,
              messageId: responseTypeComment
                ? "incorrectGeneratedResponseType"
                : "missingGeneratedResponseType",
              data: {
                actualType: responseTypeComment?.type ?? "",
                expectedType: responseType,
              },
              suggest: [
                createGeneratedTypeSuggestion(
                  context,
                  declaration,
                  responseType,
                  responseTypeComment,
                ),
              ],
            })
          }
        }
      },
    }
  },
}

export default preferGeneratedCustomApiTypes
