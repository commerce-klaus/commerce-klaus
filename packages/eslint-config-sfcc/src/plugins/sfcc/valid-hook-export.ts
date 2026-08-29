import type { Rule } from "eslint"

import { getRequiredHookExportsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import { hasStaticCommonJsExport, isJavaScriptTarget } from "../_utils/commonjs-exports.ts"

const validHookExport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Requires a static CommonJS export for each Salesforce hook method registered for this file in the cartridge's hooks.json.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/valid-hook-export",
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
