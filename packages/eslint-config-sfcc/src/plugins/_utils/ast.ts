import type { Rule } from "eslint"

export function getStaticMemberName(node: Rule.Node): string | undefined {
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
