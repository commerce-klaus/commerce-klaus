import type { Rule } from "eslint"

import { getRequiredHookExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"
import fs from "node:fs"
import path from "node:path"

import {
  type ProgramNode,
  createGeneratedTypeSuggestion,
  findExportAnnotationTarget,
  getTypeComment,
} from "../_utils/generated-function-types.ts"
import { withSfccSettings } from "../_utils/sfcc-settings.ts"

const GENERATED_HOOK_TYPES_FILE_NAME = "sfcc-hooks.generated.d.ts"

function toHookTypeName(hookName: string): string {
  return hookName
    .split(".")
    .slice(1)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join("")
}

function hasGeneratedHookType(typeName: string, cartridgesDir: string): boolean {
  const workspaceRoot = path.dirname(path.resolve(cartridgesDir))
  const generatedTypesPath = path.join(
    workspaceRoot,
    ".b2c-script-types",
    "types",
    GENERATED_HOOK_TYPES_FILE_NAME,
  )

  try {
    const generatedTypes = fs.readFileSync(generatedTypesPath, "utf8")
    return generatedTypes.includes(`    type ${typeName} = `)
  } catch {
    return false
  }
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
  create: withSfccSettings((context, settings) => {
    const cartridgesDir = settings.cartridgesDir ?? "cartridges"

    return {
      "Program:exit"(node) {
        const program = node as unknown as ProgramNode
        for (const { exportName, hookName } of getRequiredHookExportsForScriptFile(
          context.filename,
        )) {
          const hookTypeName = toHookTypeName(hookName)
          if (!hasGeneratedHookType(hookTypeName, cartridgesDir)) {
            continue
          }

          const target = findExportAnnotationTarget(program, exportName)
          if (!target) {
            continue
          }

          const expectedType = `SfccHooks.${hookTypeName}`
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
  }),
}

export default preferGeneratedHookTypes
