import type { Rule } from "eslint"

import { getStaticModulePath } from "../_utils/static-module.js"
import { createSfccModuleCheck, isNativeRequire } from "./utils.js"

const noCartridgeRequire: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Load SFCC modules through Vite imports instead of native require in tests.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-cartridge-require",
    },
    schema: [],
    messages: {
      nativeRequire:
        "Native require() bypasses the SFCC Vite loader in tests. Use await import() after runtime setup to load this SFCC module.",
    },
  },
  create(context) {
    const isSfccModule = createSfccModuleCheck(context)
    return {
      CallExpression(node) {
        if (!isNativeRequire(context, node.callee as Rule.Node)) {
          return
        }
        const source = getStaticModulePath(node.arguments[0] as Rule.Node | undefined)
        if (
          source &&
          (source.startsWith("*/") ||
            source.startsWith("~/") ||
            source.startsWith("server/") ||
            /^[A-Za-z0-9_-]+\/cartridge\//u.test(source) ||
            isSfccModule(source))
        ) {
          context.report({ node, messageId: "nativeRequire" })
        }
      },
    }
  },
}

export default noCartridgeRequire
