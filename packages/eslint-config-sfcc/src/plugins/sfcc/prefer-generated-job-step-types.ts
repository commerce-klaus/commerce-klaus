import type { Rule } from "eslint"

import {
  type ResolvedStepTypeDefinition,
  getResolvedStepTypeDefinitionsForScriptFile,
} from "@commerce-klaus/sfcc-module-resolver"

import {
  type ProgramNode,
  createGeneratedTypeSuggestion,
  findExportAnnotationTarget,
  getTypeComment,
} from "../_utils/generated-function-types.ts"
import { withSfccSettings } from "../_utils/sfcc-settings.ts"

function getFunctions(definition: ResolvedStepTypeDefinition): Array<[string, string]> {
  return definition.kind === "script-module-step"
    ? [[definition.functionName, definition.functionName]]
    : Object.values(definition.functions).map((functionName) => [functionName, functionName])
}

const preferGeneratedJobStepTypes: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Requires registered job step exports to use their generated SfccJobSteps function type.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-generated-job-step-types",
      recommended: false,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      missingGeneratedType:
        'Job step export "{{exportName}}" should use its generated type "{{expectedType}}".',
      incorrectGeneratedType:
        'Job step export "{{exportName}}" uses "{{actualType}}" instead of its generated type "{{expectedType}}".',
      useGeneratedType: 'Use the generated type "{{expectedType}}".',
    },
  },
  create: withSfccSettings((context, settings) => ({
    "Program:exit"(node) {
      const program = node as unknown as ProgramNode
      const definitions = getResolvedStepTypeDefinitionsForScriptFile(context.filename, {
        cartridgePath: settings.cartridgePath,
        cartridgesDir: settings.cartridgesDir ?? "cartridges",
        site: settings.site,
        siteTemplatePath: settings.siteTemplatePath,
      })

      for (const definition of definitions) {
        for (const [exportName] of getFunctions(definition)) {
          const target = findExportAnnotationTarget(program, exportName)
          if (!target) {
            continue
          }

          const expectedType = `SfccJobSteps.Definitions[${JSON.stringify(definition.typeId)}]["Functions"][${JSON.stringify(exportName)}]`
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
      }
    },
  })),
}

export default preferGeneratedJobStepTypes
