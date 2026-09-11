import type { Rule, Scope } from "eslint"

import { getStaticMemberName } from "../_utils/ast.js"
import { createStaticModuleListeners, getRequiredModulePath } from "../_utils/static-module.js"

function isFormModule(modulePath: string | undefined): modulePath is string {
  return modulePath !== undefined && /^dw\/web\/Form(?:$|s$|[A-Z])/u.test(modulePath)
}

function resolvesToServerBinding(
  context: Rule.RuleContext,
  node: Rule.Node & { name?: string },
  serverBindings: Set<Scope.Variable>,
): boolean {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node as never)
  while (scope) {
    const variable = scope.variables.find(({ name }) => name === node.name)
    if (variable) {
      return serverBindings.has(variable)
    }
    scope = scope.upper
  }

  return false
}

const noForms: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow SFCC and SFRA form APIs.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-forms",
      recommended: false,
    },
    schema: [],
    messages: {
      formModule: 'The SFCC form module "{{modulePath}}" is not allowed by this project.',
      sfraForms: "The SFRA server.forms API is not allowed by this storefront architecture.",
    },
  },
  create(context) {
    const serverBindings = new Set<Scope.Variable>()

    return {
      ...createStaticModuleListeners((node, modulePath) => {
        if (isFormModule(modulePath)) {
          context.report({ node, messageId: "formModule", data: { modulePath } })
        }
      }),
      VariableDeclarator(node) {
        if (!node.init || getRequiredModulePath(node.init as unknown as Rule.Node) !== "server") {
          return
        }

        for (const variable of context.sourceCode.getDeclaredVariables(node as never)) {
          serverBindings.add(variable)
        }
      },
      MemberExpression(node) {
        const member = node as unknown as Rule.Node & {
          object: Rule.Node & { name?: string }
        }
        if (
          getStaticMemberName(member) === "forms" &&
          member.object.type === "Identifier" &&
          resolvesToServerBinding(context, member.object, serverBindings)
        ) {
          context.report({ node, messageId: "sfraForms" })
        }
      },
    }
  },
}

export default noForms
