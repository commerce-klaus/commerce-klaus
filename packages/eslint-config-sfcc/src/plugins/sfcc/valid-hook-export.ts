import type { Rule } from "eslint"

import { getRequiredHookExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

function isJavaScriptTarget(filename: string): boolean {
  if (filename === "<input>") {
    return true
  }

  return /\.(?:[cm]?js|ds)$/iu.test(filename)
}

function getPropertyKeyName(
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

function isModuleExportsMemberExpression(node: Rule.Node): boolean {
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

function isExportsPropertyAssignment(left: Rule.Node, exportName: string): boolean {
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

function isModuleExportsObjectLiteralExport(
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

function hasStaticCommonJsExport(
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

const validHookExport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires a static CommonJS export for each Salesforce hook method registered for this file in the cartridge's hooks.json.",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/valid-hook-export.md",
      recommended: true,
    },
    schema: [],
    messages: {
      missingHookExport:
        'Hook "{{hookName}}" requires a static CommonJS export named "{{exportName}}".',
    },
  },
  create(context): Rule.RuleListener {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      "Program:exit"(node) {
        const program = node as unknown as Rule.Node & { body: Rule.Node[] }
        const requiredExports = getRequiredHookExportsForScriptFile(context.filename)

        for (const { hookName, exportName } of requiredExports) {
          if (!hasStaticCommonJsExport(program, exportName)) {
            context.report({
              node: node as unknown as Rule.Node,
              messageId: "missingHookExport",
              data: { hookName, exportName },
            })
          }
        }
      },
    }
  },
}

export default validHookExport
