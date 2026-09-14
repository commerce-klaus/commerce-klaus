import type { Rule } from "eslint"

import {
  SUPPORTED_RUNTIME_EXTENSIONS,
  createSfccModuleResolver,
  inferCartridgeOrder,
  resolveCandidateFile,
} from "@commerce-klaus/sfcc-module-resolver"
import path from "node:path"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import { getStaticModulePath } from "../_utils/static-module.js"

const EXTENSION_PATTERN = new RegExp(`\\.(${SUPPORTED_RUNTIME_EXTENSIONS.join("|")})$`, "u")

function isFileModulePath(modulePath: string): boolean {
  return (
    modulePath.startsWith("./") ||
    modulePath.startsWith("../") ||
    modulePath.startsWith("~/") ||
    modulePath.startsWith("*/") ||
    /^[A-Za-z0-9_-]+\/cartridge\/.+/u.test(modulePath)
  )
}

const requireFileExtension: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require explicit file extensions in resolvable SFCC module paths.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/require-file-extension",
      recommended: false,
    },
    fixable: "code",
    schema: [],
    messages: {
      missingExtension: 'Add the explicit file extension to module path "{{modulePath}}".',
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
    })
    const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
    const filename = path.isAbsolute(context.filename)
      ? context.filename
      : path.resolve(cwd, context.filename)

    function resolveModule(modulePath: string): string | undefined {
      if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
        return resolveCandidateFile(path.resolve(path.dirname(filename), modulePath), modulePath)
      }

      return resolveSfccModule(modulePath, filename)
    }

    function checkModuleArgument(reportNode: Rule.Node | undefined) {
      const modulePath = getStaticModulePath(reportNode)
      if (!reportNode || !modulePath || !isFileModulePath(modulePath)) {
        return
      }

      if (EXTENSION_PATTERN.test(modulePath)) {
        return
      }

      const resolvedPath = resolveModule(modulePath)
      const extension = resolvedPath ? path.extname(resolvedPath) : undefined
      const canFix =
        extension !== undefined &&
        path.basename(resolvedPath as string, extension) === path.posix.basename(modulePath) &&
        SUPPORTED_RUNTIME_EXTENSIONS.includes(
          extension.slice(1) as (typeof SUPPORTED_RUNTIME_EXTENSIONS)[number],
        )

      context.report({
        node: reportNode,
        messageId: "missingExtension",
        data: { modulePath },
        ...(canFix
          ? {
              fix: (fixer: Rule.RuleFixer) => {
                const literalText = context.sourceCode.getText(reportNode)
                return fixer.replaceText(
                  reportNode,
                  `${literalText.slice(0, -1)}${extension}${literalText.slice(-1)}`,
                )
              },
            }
          : {}),
      })
    }

    return {
      CallExpression(node) {
        const callNode = node as Rule.Node & {
          callee?: { type?: string; name?: string }
          arguments?: Rule.Node[]
        }

        if (callNode.callee?.type === "Identifier" && callNode.callee.name === "require") {
          checkModuleArgument(callNode.arguments?.[0])
        }
      },
      ImportExpression(node) {
        checkModuleArgument((node as Rule.Node & { source?: Rule.Node }).source)
      },
    }
  }),
}

export default requireFileExtension
