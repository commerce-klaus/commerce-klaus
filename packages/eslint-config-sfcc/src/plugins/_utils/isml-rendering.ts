import type { Rule, Scope } from "eslint"

import { getStaticMemberName } from "./ast.js"
import { getRequiredModulePath, getStaticModulePath } from "./static-module.js"

const TEMPLATE_MODULES = new Set(["dw/template/ISML", "dw/util/Template"])
const ROUTE_METHODS = new Set(["append", "get", "post", "prepend", "replace", "use"])

interface RenderingChecks {
  responseRender?: boolean
  templateModule?: boolean
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
    !ROUTE_METHODS.has(getStaticMemberName(callee) ?? "") ||
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
  if (getStaticMemberName(callee) !== "render" || callee.object.type !== "Identifier") {
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

export function createIsmlRenderingListeners(
  context: Rule.RuleContext,
  checks: RenderingChecks,
): Rule.RuleListener {
  const serverBindings = new Set<Scope.Variable>()

  return {
    VariableDeclarator(node) {
      if (!checks.responseRender || node.id.type !== "Identifier" || !node.init) {
        return
      }

      if (getRequiredModulePath(node.init as unknown as Rule.Node) === "server") {
        for (const variable of context.sourceCode.getDeclaredVariables(node as never)) {
          serverBindings.add(variable)
        }
      }
    },
    ImportExpression(node) {
      if (!checks.templateModule) {
        return
      }

      const modulePath = getStaticModulePath(node.source as Rule.Node)
      if (modulePath && TEMPLATE_MODULES.has(modulePath)) {
        context.report({ node, messageId: "templateModule", data: { modulePath } })
      }
    },
    CallExpression(node) {
      if (checks.templateModule) {
        const modulePath = getRequiredModulePath(node)
        if (modulePath && TEMPLATE_MODULES.has(modulePath)) {
          context.report({ node, messageId: "templateModule", data: { modulePath } })
        }
      }

      if (checks.responseRender && isRouteResponseRender(context, node, serverBindings)) {
        context.report({ node, messageId: "responseRender" })
      }
    },
  }
}
