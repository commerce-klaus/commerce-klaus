import type { Rule, Scope } from "eslint"

import { getRequiredModulePath, getStaticModulePath } from "../_utils/static-module.js"

const TEMPLATE_MODULES = new Set(["dw/template/ISML", "dw/util/Template"])
const ROUTE_METHODS = new Set(["append", "get", "post", "prepend", "replace", "use"])

function getMemberName(node: Rule.Node): string | undefined {
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

function getRequiredBinding(node: Rule.Node): { modulePath: string } | undefined {
  if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier" || !node.init) {
    return undefined
  }

  const modulePath = getRequiredModulePath(node.init as unknown as Rule.Node)
  return modulePath ? { modulePath } : undefined
}

function getDirectParent(node: Rule.Node): Rule.Node | undefined {
  return (node as Rule.Node & { parent?: Rule.Node }).parent
}

function isRegisteredRouteHandler(
  context: Rule.RuleContext,
  functionNode: Rule.Node,
  serverBindings: Set<Scope.Variable>,
): boolean {
  const parent = getDirectParent(functionNode)
  if (parent?.type !== "CallExpression" || parent.callee.type !== "MemberExpression") {
    return false
  }

  const callee = parent.callee as unknown as Rule.Node & {
    object: Rule.Node & { name?: string }
  }
  if (
    callee.object.type !== "Identifier" ||
    !ROUTE_METHODS.has(getMemberName(callee) ?? "") ||
    !parent.arguments.includes(functionNode as never)
  ) {
    return false
  }

  const serverName = callee.object.name
  let scope: Scope.Scope | null = context.sourceCode.getScope(callee.object as never)
  while (scope) {
    const variable = scope.variables.find(({ name }) => name === serverName)
    if (variable) {
      return serverBindings.has(variable)
    }
    scope = scope.upper
  }

  return false
}

function isRouteResponseRender(
  context: Rule.RuleContext,
  node: Rule.Node,
  serverBindings: Set<Scope.Variable>,
): boolean {
  if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
    return false
  }

  const callee = node.callee as unknown as Rule.Node & {
    object: Rule.Node & { name?: string }
  }
  if (getMemberName(callee) !== "render" || callee.object.type !== "Identifier") {
    return false
  }

  const responseName = callee.object.name
  const ancestors = [] as Rule.Node[]
  let ancestor = getDirectParent(node)
  while (ancestor) {
    ancestors.push(ancestor)
    ancestor = getDirectParent(ancestor)
  }

  const handler = ancestors.find(
    (candidate) =>
      candidate.type === "FunctionExpression" || candidate.type === "ArrowFunctionExpression",
  )
  if (!handler) {
    return false
  }

  const responseParameter = handler.params[1]
  return (
    responseParameter?.type === "Identifier" &&
    responseParameter.name === responseName &&
    isRegisteredRouteHandler(context, handler, serverBindings)
  )
}

const noIsmlRendering: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow server-side ISML and template rendering.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-isml-rendering",
      recommended: false,
    },
    schema: [],
    messages: {
      templateModule: 'The template module "{{modulePath}}" is not allowed by this project.',
      responseRender:
        "Rendering ISML through the storefront response is not allowed by this project.",
    },
  },
  create(context) {
    const serverBindings = new Set<Scope.Variable>()

    return {
      VariableDeclarator(node) {
        const binding = getRequiredBinding(node)
        if (binding?.modulePath === "server") {
          for (const variable of context.sourceCode.getDeclaredVariables(node as never)) {
            serverBindings.add(variable)
          }
        }
      },
      ImportExpression(node) {
        const modulePath = getStaticModulePath(node.source as Rule.Node)
        if (modulePath && TEMPLATE_MODULES.has(modulePath)) {
          context.report({ node, messageId: "templateModule", data: { modulePath } })
        }
      },
      CallExpression(node) {
        const modulePath = getRequiredModulePath(node)
        if (modulePath && TEMPLATE_MODULES.has(modulePath)) {
          context.report({ node, messageId: "templateModule", data: { modulePath } })
        }

        if (isRouteResponseRender(context, node, serverBindings)) {
          context.report({ node, messageId: "responseRender" })
        }
      },
    }
  },
}

export default noIsmlRendering
