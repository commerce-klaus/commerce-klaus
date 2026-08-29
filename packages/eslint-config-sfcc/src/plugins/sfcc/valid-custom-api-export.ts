import type { Rule } from "eslint"

import { getRequiredCustomApiExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import {
  hasStaticCommonJsExport,
  hasStaticCommonJsExportMarkedPublic,
  isJavaScriptTarget,
} from "../_utils/commonjs-exports.ts"

const validCustomApiExport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires a public static CommonJS export for each Custom API endpoint mapped to this file in the rest-apis api.json.",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/valid-custom-api-export.md",
      recommended: true,
    },
    schema: [],
    messages: {
      missingCustomApiExport:
        'Custom API endpoint "{{operationId}}" requires a static CommonJS export named "{{operationId}}".',
      missingPublicFlag:
        'Custom API endpoint "{{operationId}}" requires "exports.{{operationId}}.public = true".',
    },
  },
  create(context): Rule.RuleListener {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      "Program:exit"(node) {
        const program = node as unknown as Rule.Node & { body: Rule.Node[] }
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
            context.report({
              node: node as unknown as Rule.Node,
              messageId: "missingPublicFlag",
              data: { operationId },
            })
          }
        }
      },
    }
  },
}

export default validCustomApiExport
