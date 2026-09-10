import type { Rule } from "eslint"

import { getRequiredHookExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import {
  type ProgramNode,
  createGeneratedTypeSuggestion,
  findExportAnnotationTarget,
  getTypeComment,
} from "../_utils/generated-function-types.ts"

function toHookTypeName(hookName: string): string {
  return hookName
    .split(".")
    .slice(1)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join("")
}

const preferGeneratedHookTypes: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Requires registered SFCC hook exports to use their generated SfccHooks type.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-generated-hook-types",
      recommended: false,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      missingGeneratedType:
        'Hook export "{{exportName}}" should use its generated type "{{expectedType}}".',
      incorrectGeneratedType:
        'Hook export "{{exportName}}" uses "{{actualType}}" instead of its generated type "{{expectedType}}".',
      useGeneratedType: 'Use the generated type "{{expectedType}}".',
    },
  },
  create(context) {
    return {
      "Program:exit"(node) {
        const program = node as unknown as ProgramNode
        for (const { exportName, hookName } of getRequiredHookExportsForScriptFile(
          context.filename,
        )) {
          const target = findExportAnnotationTarget(program, exportName)
          if (!target) {
            continue
          }

          const expectedType = `SfccHooks.${toHookTypeName(hookName)}`
          const typeComment = getTypeComment(context, target)
          if (typeComment?.type === expectedType) {
            continue
          }

          context.report({
            node: target,
            messageId: typeComment ? "incorrectGeneratedType" : "missingGeneratedType",
            data: {
              actualType: typeComment?.type ?? "",
              expectedType,
              exportName,
            },
            suggest: [createGeneratedTypeSuggestion(context, target, expectedType, typeComment)],
          })
        }
      },
    }
  },
}

export default preferGeneratedHookTypes
