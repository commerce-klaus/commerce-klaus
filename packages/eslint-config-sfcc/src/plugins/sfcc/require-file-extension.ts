import type { Rule } from "eslint"

import {
  SUPPORTED_RUNTIME_EXTENSIONS,
  createModuleResolver,
  inferCartridgeOrder,
  resolveCandidateFile,
} from "@commerce-klaus/sfcc-module-resolver/resolution"
import path from "node:path"

import { getStaticMemberName } from "../_utils/ast.js"
import { withSfccSettings } from "../_utils/sfcc-settings.js"
import { getStaticModulePath } from "../_utils/static-module.js"
import { isNativeRequire, isRuntime, isValueImport } from "../sfcc-test/utils.js"

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
      solutionConfigPath: sfccSettings.solutionConfigPath,
      envCartridgePath: sfccSettings.envCartridgePath,
    })
    const resolveSfccModule = createModuleResolver(cartridgeRoots)
    const filename = path.isAbsolute(context.filename)
      ? context.filename
      : path.resolve(cwd, context.filename)

    function resolveModule(modulePath: string): string | undefined {
      if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
        return resolveCandidateFile(path.resolve(path.dirname(filename), modulePath), modulePath)
      }

      return resolveSfccModule(modulePath, filename)
    }

    function checkModuleArgument(reportNode: Rule.Node | undefined, mock = false) {
      const modulePath = getStaticModulePath(reportNode)
      if (!reportNode || !modulePath || !isFileModulePath(modulePath)) {
        return
      }

      if (EXTENSION_PATTERN.test(modulePath)) {
        return
      }

      // Mock IDs refer to identifiers in cartridge code, not paths relative to this test.
      const resolvedPath = mock ? undefined : resolveModule(modulePath)
      const extension = resolvedPath ? path.extname(resolvedPath) : undefined
      const canFix =
        resolvedPath !== undefined &&
        extension !== undefined &&
        path.basename(resolvedPath, extension) === path.posix.basename(modulePath) &&
        SUPPORTED_RUNTIME_EXTENSIONS.some((supported) => supported === extension.slice(1))

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
        if (isNativeRequire(context, node.callee as Rule.Node)) {
          checkModuleArgument(node.arguments[0] as Rule.Node | undefined)
        } else if (
          node.callee.type === "MemberExpression" &&
          getStaticMemberName(node.callee as Rule.Node) === "mock" &&
          isRuntime(context, node.callee.object as Rule.Node)
        ) {
          checkModuleArgument(node.arguments[0] as Rule.Node | undefined, true)
        }
      },
      ImportDeclaration(node) {
        if (isValueImport(node)) {
          checkModuleArgument(node.source as Rule.Node)
        }
      },
      ImportExpression(node) {
        checkModuleArgument((node as Rule.Node & { source?: Rule.Node }).source)
      },
    }
  }),
}

export default requireFileExtension
