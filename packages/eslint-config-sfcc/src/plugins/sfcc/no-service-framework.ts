import type { Rule } from "eslint"

import { createStaticModuleListeners } from "../_utils/static-module.js"

const SERVICE_FRAMEWORK_NAMESPACE = "dw/svc/"

const noServiceFramework: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Service Framework APIs in selected cartridges.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-service-framework",
      recommended: false,
    },
    schema: [],
    messages: {
      serviceFramework:
        'The Service Framework API module "{{modulePath}}" is not allowed in this cartridge.',
    },
  },
  create(context) {
    return createStaticModuleListeners((node, modulePath) => {
      if (modulePath?.startsWith(SERVICE_FRAMEWORK_NAMESPACE)) {
        context.report({ node, messageId: "serviceFramework", data: { modulePath } })
      }
    })
  },
}

export default noServiceFramework
