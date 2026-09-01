import type { Rule } from "eslint"

import { getRequiredModulePath, getStaticModulePath } from "../_utils/static-module.js"

const SFRA_SERVER_MODULE = "server"

const noSfraServer: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow the SFRA server module and routing API.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-sfra-server",
      recommended: false,
    },
    schema: [],
    messages: {
      sfraServer: 'The SFRA "server" module is not allowed by this storefront architecture.',
    },
  },
  create(context) {
    function reportIfSfraServer(node: Rule.Node, modulePath: string | undefined): void {
      if (modulePath === SFRA_SERVER_MODULE) {
        context.report({ node, messageId: "sfraServer" })
      }
    }

    return {
      CallExpression(node) {
        reportIfSfraServer(node, getRequiredModulePath(node))
      },
      ImportExpression(node) {
        reportIfSfraServer(node, getStaticModulePath(node.source as Rule.Node))
      },
    }
  },
}

export default noSfraServer
