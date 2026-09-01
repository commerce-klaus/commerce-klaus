import type { Rule } from "eslint"

export function getStaticModulePath(node: Rule.Node | undefined): string | undefined {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value
  }

  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined
  }

  return undefined
}

export function getRequiredModulePath(node: Rule.Node): string | undefined {
  if (
    node.type !== "CallExpression" ||
    node.callee.type !== "Identifier" ||
    node.callee.name !== "require"
  ) {
    return undefined
  }

  return getStaticModulePath(node.arguments[0] as Rule.Node | undefined)
}
