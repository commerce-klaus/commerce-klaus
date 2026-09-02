import type { Rule } from "eslint"

import { getRequiredModulePath, getStaticModulePath } from "../_utils/static-module.js"

function isAllowedModule(modulePath: string, allowedModules: Set<string>): boolean {
  if (allowedModules.has(modulePath)) {
    return true
  }

  for (const allowedModule of allowedModules) {
    if (allowedModule.endsWith("/*") && modulePath.startsWith(allowedModule.slice(0, -1))) {
      return true
    }
  }

  return false
}

const noDwApi: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow SFCC dw/* APIs in portable JavaScript modules.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-dw-api",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: { type: "string", pattern: "^dw/.+" },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      dwApi: 'The SFCC API module "{{modulePath}}" is not allowed in portable code.',
    },
  },
  create(context) {
    const options = context.options[0] as { allow?: string[] } | undefined
    const allowedModules = new Set(options?.allow ?? [])

    function reportDwApi(node: Rule.Node, modulePath: string | undefined): void {
      if (modulePath?.startsWith("dw/") && !isAllowedModule(modulePath, allowedModules)) {
        context.report({ node, messageId: "dwApi", data: { modulePath } })
      }
    }

    return {
      CallExpression(node) {
        reportDwApi(node, getRequiredModulePath(node))
      },
      ImportExpression(node) {
        reportDwApi(node, getStaticModulePath(node.source as Rule.Node))
      },
    }
  },
}

export default noDwApi
