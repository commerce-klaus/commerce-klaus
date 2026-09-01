import type { Rule } from "eslint"

import { getRequiredModulePath, getStaticModulePath } from "../_utils/static-module.js"

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
    function reportIfPipelineModule(node: Rule.Node, modulePath: string | undefined): void {
      if (modulePath === PIPELINE_MODULE) {
        context.report({ node, messageId: "pipelineApi", data: { modulePath } })
      }
    }

    return {
      CallExpression(node) {
        reportIfPipelineModule(node, getRequiredModulePath(node))
      },
      ImportExpression(node) {
        reportIfPipelineModule(node, getStaticModulePath(node.source as Rule.Node))
      },
    }
  },
}

export default noPipelineApi
