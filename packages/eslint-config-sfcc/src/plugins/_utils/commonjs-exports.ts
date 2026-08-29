import type { Rule } from "eslint"

export function isJavaScriptTarget(filename: string): boolean {
  if (filename === "<input>") {
    return true
  }

  return /\.(?:[cm]?js|ds)$/iu.test(filename)
}

export function getPropertyKeyName(
  property: Rule.Node & { key: Rule.Node; computed?: boolean },
): string | undefined {
  if (property.computed) {
    return undefined
  }

  if (property.key.type === "Identifier") {
    return (property.key as Rule.Node & { name: string }).name
  }

  if (
    property.key.type === "Literal" &&
    typeof (property.key as { value: unknown }).value === "string"
  ) {
    return (property.key as unknown as { value: string }).value
  }

  return undefined
}

export function isModuleExportsMemberExpression(node: Rule.Node): boolean {
  const memberExpression = node as Rule.Node & {
    object?: Rule.Node & { name?: string }
    property?: Rule.Node & { name?: string }
    computed?: boolean
  }

  return (
    node.type === "MemberExpression" &&
    !memberExpression.computed &&
    memberExpression.object?.type === "Identifier" &&
    memberExpression.object.name === "module" &&
    memberExpression.property?.type === "Identifier" &&
    memberExpression.property.name === "exports"
  )
}

export function isExportsPropertyAssignment(left: Rule.Node, exportName: string): boolean {
  const memberExpression = left as Rule.Node & {
    object?: Rule.Node & { name?: string }
    property?: Rule.Node & { name?: string }
    computed?: boolean
  }

  if (left.type !== "MemberExpression" || memberExpression.computed) {
    return false
  }

  if (
    memberExpression.property?.type !== "Identifier" ||
    memberExpression.property.name !== exportName
  ) {
    return false
  }

  const object = memberExpression.object
  if (!object) {
    return false
  }

  return (
    (object.type === "Identifier" && object.name === "exports") ||
    isModuleExportsMemberExpression(object)
  )
}

export function isModuleExportsObjectLiteralExport(
  left: Rule.Node,
  right: Rule.Node,
  exportName: string,
): boolean {
  if (!isModuleExportsMemberExpression(left) || right.type !== "ObjectExpression") {
    return false
  }

  const objectExpression = right as Rule.Node & { properties: Rule.Node[] }

  return objectExpression.properties.some((property) => {
    if (property.type !== "Property") {
      return false
    }

    return getPropertyKeyName(property as Rule.Node & { key: Rule.Node }) === exportName
  })
}

export function hasStaticCommonJsExport(
  program: Rule.Node & { body: Rule.Node[] },
  exportName: string,
): boolean {
  return program.body.some((statement) => {
    if (statement.type !== "ExpressionStatement") {
      return false
    }

    const expression = (statement as Rule.Node & { expression: Rule.Node }).expression
    if (expression.type !== "AssignmentExpression") {
      return false
    }

    const assignment = expression as Rule.Node & {
      operator: string
      left: Rule.Node
      right: Rule.Node
    }

    if (assignment.operator !== "=") {
      return false
    }

    return (
      isExportsPropertyAssignment(assignment.left, exportName) ||
      isModuleExportsObjectLiteralExport(assignment.left, assignment.right, exportName)
    )
  })
}

// Matches `exports.<exportName>.public = true` and `module.exports.<exportName>.public = true`.
export function hasStaticCommonJsExportMarkedPublic(
  program: Rule.Node & { body: Rule.Node[] },
  exportName: string,
): boolean {
  return program.body.some((statement) => {
    if (statement.type !== "ExpressionStatement") {
      return false
    }

    const expression = (statement as Rule.Node & { expression: Rule.Node }).expression
    if (expression.type !== "AssignmentExpression") {
      return false
    }

    const assignment = expression as Rule.Node & {
      operator: string
      left: Rule.Node
      right: Rule.Node
    }

    if (assignment.operator !== "=") {
      return false
    }

    const isPublicLiteral =
      assignment.right.type === "Literal" &&
      (assignment.right as unknown as { value: unknown }).value === true

    return isPublicLiteral && isPublicPropertyOfExport(assignment.left, exportName)
  })
}

function isPublicPropertyOfExport(left: Rule.Node, exportName: string): boolean {
  const memberExpression = left as Rule.Node & {
    object?: Rule.Node
    property?: Rule.Node & { name?: string }
    computed?: boolean
  }

  if (
    left.type !== "MemberExpression" ||
    memberExpression.computed ||
    memberExpression.property?.type !== "Identifier" ||
    memberExpression.property.name !== "public"
  ) {
    return false
  }

  const object = memberExpression.object
  return object !== undefined && isExportsPropertyAssignment(object, exportName)
}
