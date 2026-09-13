import type { Rule } from "eslint"

import { getResolvedStepTypeDefinitionsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import { hasStaticCommonJsExport, isJavaScriptTarget } from "../_utils/commonjs-exports.ts"
import { withSfccSettings } from "../_utils/sfcc-settings.js"

const validJobStepExport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires static CommonJS exports for the functions configured for job step modules in steptypes.json.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/valid-job-step-export",
      recommended: true,
    },
    schema: [],
    messages: {
      missingJobStepExport:
        'Job step "{{typeId}}" requires a static CommonJS export named "{{exportName}}".',
    },
  },
  create: withSfccSettings((context, options): Rule.RuleListener => {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      "Program:exit"(node) {
        const program = node as unknown as Rule.Node & { body: Rule.Node[] }
        const definitions = getResolvedStepTypeDefinitionsForScriptFile(context.filename, {
          cartridgesDir: options.cartridgesDir ?? "cartridges",
          cartridgePath: options.cartridgePath,
          siteTemplatePath: options.siteTemplatePath,
          site: options.site,
        })

        for (const definition of definitions) {
          const exportNames =
            definition.kind === "script-module-step"
              ? [definition.functionName]
              : Object.values(definition.functions)

          for (const exportName of new Set(exportNames)) {
            if (!hasStaticCommonJsExport(program, exportName)) {
              context.report({
                node: node as unknown as Rule.Node,
                messageId: "missingJobStepExport",
                data: { typeId: definition.typeId, exportName },
              })
            }
          }
        }
      },
    }
  }),
}

export default validJobStepExport
