import type { Rule } from "eslint"

import { getRequiredCustomApiExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import {
  getPropertyKeyName,
  hasStaticCommonJsExport,
  hasStaticCommonJsExportMarkedPublic,
  isExportsPropertyAssignment,
  isJavaScriptTarget,
  isModuleExportsMemberExpression,
} from "../_utils/commonjs-exports.ts"

type ProgramNode = Rule.Node & { body: Rule.Node[] }

function getPublicFlagSuggestion(
  context: Rule.RuleContext,
  program: ProgramNode,
  exportName: string,
): Rule.SuggestionReportDescriptor | undefined {
  for (const statement of program.body) {
    if (
      statement.type !== "ExpressionStatement" ||
      statement.expression.type !== "AssignmentExpression"
    ) {
      continue
    }

    const assignment = statement.expression
    if (assignment.operator !== "=") {
      continue
    }

    let target: string | undefined
    let insertBefore = false
    const assignmentTarget = assignment.left as Rule.Node
    if (isExportsPropertyAssignment(assignmentTarget, exportName)) {
      if (assignment.right.type === "Identifier") {
        target = assignment.right.name
        insertBefore = true
      } else {
        target = context.sourceCode.getText(assignment.left)
      }
    } else if (
      isModuleExportsMemberExpression(assignmentTarget) &&
      assignment.right.type === "ObjectExpression"
    ) {
      const property = assignment.right.properties.find(
        (candidate) =>
          candidate.type === "Property" &&
          getPropertyKeyName(candidate as Rule.Node & { key: Rule.Node }) === exportName,
      )
      if (!property || property.type !== "Property") {
        continue
      }

      if (property.value.type === "Identifier") {
        target = property.value.name
        insertBefore = true
      } else {
        target = `module.exports[${JSON.stringify(exportName)}]`
      }
    }

    if (!target) {
      continue
    }

    const indentation = " ".repeat(statement.loc?.start.column ?? 0)
    const semicolon = context.sourceCode.getText(statement).trimEnd().endsWith(";") ? ";" : ""
    const publicAssignment = `${target}.public = true${semicolon}`
    return {
      messageId: "addPublicFlag",
      data: { target },
      fix: insertBefore
        ? (fixer) => fixer.insertTextBefore(statement, `${publicAssignment}\n${indentation}`)
        : (fixer) => fixer.insertTextAfter(statement, `\n${indentation}${publicAssignment}`),
    }
  }

  return undefined
}

const validCustomApiExport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires a public static CommonJS export for each Custom API endpoint mapped to this file in the rest-apis api.json.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/valid-custom-api-export",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      missingCustomApiExport:
        'Custom API endpoint "{{operationId}}" requires a static CommonJS export named "{{operationId}}".',
      missingPublicFlag:
        'Custom API endpoint "{{operationId}}" requires "exports.{{operationId}}.public = true".',
      addPublicFlag: 'Add "{{target}}.public = true".',
    },
  },
  create(context): Rule.RuleListener {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      "Program:exit"(node) {
        const program = node as unknown as ProgramNode
        const requiredExports = getRequiredCustomApiExportsForScriptFile(context.filename)

        for (const { operationId } of requiredExports) {
          if (!hasStaticCommonJsExport(program, operationId)) {
            context.report({
              node: node as unknown as Rule.Node,
              messageId: "missingCustomApiExport",
              data: { operationId },
            })
            continue
          }

          if (!hasStaticCommonJsExportMarkedPublic(program, operationId)) {
            const suggestion = getPublicFlagSuggestion(context, program, operationId)
            context.report({
              node: node as unknown as Rule.Node,
              messageId: "missingPublicFlag",
              data: { operationId },
              ...(suggestion ? { suggest: [suggestion] } : {}),
            })
          }
        }
      },
    }
  },
}

export default validCustomApiExport
