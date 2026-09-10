import type { Rule } from "eslint"

import { getRequiredCustomApiExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

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
      useGeneratedType: 'Use the generated type "{{expectedType}}".',
    },
  },
  create(context) {
    const successCalls: Rule.Node[] = []

    return {
      CallExpression(node) {
        if (isRestResponseMgrCreateSuccess(context, node as unknown as Rule.Node)) {
          successCalls.push(node as unknown as Rule.Node)
        }
      },
      "Program:exit"(node) {
        const program = node as unknown as ProgramNode
        for (const { operationId } of getRequiredCustomApiExportsForScriptFile(context.filename)) {
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

          const reportedDeclarations = new Set<Rule.Node>()
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
            if (responseTypeComment?.type === responseType) {
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
