import type { Rule } from "eslint"

import { getRequiredCustomApiExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import { isJavaScriptTarget } from "../_utils/commonjs-exports.ts"

const DISALLOWED_RESPONSE_MEMBERS = new Set([
  "getWriter",
  "redirect",
  "render",
  "setContentType",
  "setStatus",
  "writer",
])

function getDisallowedResponseMember(node: Rule.Node): string | undefined {
  const memberExpression = node as Rule.Node & {
    object?: Rule.Node & { name?: string }
    property?: Rule.Node & { name?: string; value?: unknown }
    computed?: boolean
  }

  if (
    node.type !== "MemberExpression" ||
    memberExpression.object?.type !== "Identifier" ||
    memberExpression.object.name !== "response"
  ) {
    return undefined
  }

  const memberName = memberExpression.computed
    ? memberExpression.property?.type === "Literal" &&
      typeof memberExpression.property.value === "string"
      ? memberExpression.property.value
      : undefined
    : memberExpression.property?.type === "Identifier"
      ? memberExpression.property.name
      : undefined

  return memberName && DISALLOWED_RESPONSE_MEMBERS.has(memberName) ? memberName : undefined
}

function isLocallyDefinedResponse(context: Rule.RuleContext, node: Rule.Node): boolean {
  let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(
    node as never,
  )

  while (scope) {
    const responseVariable = scope.variables.find((variable) => variable.name === "response")
    if (responseVariable) {
      return responseVariable.defs.length > 0
    }

    scope = scope.upper
  }

  return false
}

const noCustomApiResponseMethods: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallows legacy global response APIs in Custom API implementations, which must return JSON through RESTResponseMgr.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-custom-api-response-methods",
      recommended: true,
    },
    schema: [],
    messages: {
      useRestResponseMgr:
        'Custom API implementations must not use "response.{{memberName}}"; return JSON through RESTResponseMgr instead.',
    },
  },
  create(context): Rule.RuleListener {
    if (
      !isJavaScriptTarget(context.filename) ||
      getRequiredCustomApiExportsForScriptFile(context.filename).length === 0
    ) {
      return {}
    }

    return {
      MemberExpression(node) {
        const memberName = getDisallowedResponseMember(node as unknown as Rule.Node)
        if (memberName && !isLocallyDefinedResponse(context, node as unknown as Rule.Node)) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: "useRestResponseMgr",
            data: { memberName },
          })
        }
      },
    }
  },
}

export default noCustomApiResponseMethods
