import type { Rule } from "eslint"

import { getRequiredModulePath, getStaticModulePath } from "../_utils/static-module.js"

const PAGE_DESIGNER_NAMESPACE = "dw/experience/"

const noPageDesigner: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Page Designer APIs in cartridges that do not support Page Designer.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-page-designer",
      recommended: false,
    },
    schema: [],
    messages: {
      pageDesignerApi:
        'The Page Designer API module "{{modulePath}}" is not allowed in this cartridge.',
    },
  },
  create(context) {
    function reportPageDesignerApi(node: Rule.Node, modulePath: string | undefined): void {
      if (modulePath?.startsWith(PAGE_DESIGNER_NAMESPACE)) {
        context.report({ node, messageId: "pageDesignerApi", data: { modulePath } })
      }
    }

    return {
      CallExpression(node) {
        reportPageDesignerApi(node, getRequiredModulePath(node))
      },
      ImportExpression(node) {
        reportPageDesignerApi(node, getStaticModulePath(node.source as Rule.Node))
      },
    }
  },
}

export default noPageDesigner
