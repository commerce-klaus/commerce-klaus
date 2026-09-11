import type { Rule } from "eslint"

import { createStaticModuleListeners } from "../_utils/static-module.js"

const PIPELINE_MODULE = "dw/system/Pipeline"

const noPipelineApi: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow the legacy SFCC Pipeline API.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-pipeline-api",
      recommended: false,
    },
    schema: [],
    messages: {
      pipelineApi: 'The legacy "{{modulePath}}" API is not allowed by this project.',
    },
  },
  create(context) {
    return createStaticModuleListeners((node, modulePath) => {
      if (modulePath === PIPELINE_MODULE) {
        context.report({ node, messageId: "pipelineApi", data: { modulePath } })
      }
    })
  },
}

export default noPipelineApi
