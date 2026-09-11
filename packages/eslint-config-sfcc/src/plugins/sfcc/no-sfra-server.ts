import type { Rule } from "eslint"

import { createStaticModuleListeners } from "../_utils/static-module.js"

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
    return createStaticModuleListeners((node, modulePath) => {
      if (modulePath === SFRA_SERVER_MODULE) {
        context.report({ node, messageId: "sfraServer" })
      }
    })
  },
}

export default noSfraServer
