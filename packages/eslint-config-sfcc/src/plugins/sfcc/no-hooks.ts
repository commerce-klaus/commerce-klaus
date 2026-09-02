import type { Rule } from "eslint"

import { getHookRegistrationsForScriptFile } from "@commerce-klaus/sfcc-module-resolver"

import { isJavaScriptTarget } from "../_utils/commonjs-exports.ts"

const noHooks: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow registered hook implementation files in selected cartridges.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-hooks",
      recommended: false,
    },
    schema: [],
    messages: {
      hooks: "Registered hooks are not allowed in this cartridge: {{hookNames}}.",
    },
  },
  create(context): Rule.RuleListener {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      Program(node) {
        const registrations = getHookRegistrationsForScriptFile(context.filename)
        if (registrations.length === 0) {
          return
        }

        context.report({
          node,
          messageId: "hooks",
          data: { hookNames: registrations.map(({ name }) => name).join(", ") },
        })
      },
    }
  },
}

export default noHooks
