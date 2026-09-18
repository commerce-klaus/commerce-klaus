import type { Rule } from "eslint"

import {
  findContainingCartridgeRoot,
  inferCartridgeOrder,
} from "@commerce-klaus/sfcc-module-resolver"
import path from "node:path"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import { getStaticModulePath } from "../_utils/static-module.js"

const NAMED_CARTRIDGE_PATH = /^([A-Za-z0-9_-]+)\/(cartridge\/.+)$/u

const preferTildeRequirePath: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer ~/ require paths for modules in the current cartridge.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-tilde-require-path",
      recommended: false,
    },
    fixable: "code",
    schema: [],
    messages: {
      preferTildePath:
        'Prefer the local cartridge path "{{tildePath}}" over the named path "{{requirePath}}".',
    },
  },
  create: withSfccSettings((context, sfccSettings) => {
    const cwd = context.cwd ?? process.cwd()
    const cartridgeRoots = inferCartridgeOrder({
      cartridgesDir: sfccSettings.cartridgesDir ?? "cartridges",
      cwd,
      cartridgePath: sfccSettings.cartridgePath,
      siteTemplatePath: sfccSettings.siteTemplatePath,
      site: sfccSettings.site,
      solutionConfigPath: sfccSettings.solutionConfigPath,
      envCartridgePath: sfccSettings.envCartridgePath,
    })
    const filename = path.isAbsolute(context.filename)
      ? context.filename
      : path.resolve(cwd, context.filename)
    const containingCartridgeRoot = findContainingCartridgeRoot(filename, cartridgeRoots)
    const containingCartridgeName = containingCartridgeRoot
      ? path.basename(containingCartridgeRoot)
      : undefined

    return {
      CallExpression(node) {
        const callNode = node as Rule.Node & {
          callee?: { type?: string; name?: string }
          arguments?: Rule.Node[]
        }

        if (callNode.callee?.type !== "Identifier" || callNode.callee.name !== "require") {
          return
        }

        const reportNode = callNode.arguments?.[0]
        const requirePath = getStaticModulePath(reportNode)
        const pathMatch = requirePath ? NAMED_CARTRIDGE_PATH.exec(requirePath) : null

        if (!reportNode || !pathMatch || pathMatch[1] !== containingCartridgeName) {
          return
        }

        const tildePath = `~/${pathMatch[2]}`
        const literalText = context.sourceCode.getText(reportNode)
        const fixedText = `${literalText.slice(0, 1)}~${literalText.slice(
          1 + containingCartridgeName.length,
        )}`

        context.report({
          node: reportNode,
          messageId: "preferTildePath",
          data: { requirePath, tildePath },
          fix: (fixer) => fixer.replaceText(reportNode, fixedText),
        })
      },
    }
  }),
}

export default preferTildeRequirePath
