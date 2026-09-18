import type { Rule } from "eslint"

import {
  findContainingCartridgeRoot,
  inferCartridgeOrder,
  resolveCandidateFile,
} from "@commerce-klaus/sfcc-module-resolver"
import path from "node:path"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import { getStaticModulePath } from "../_utils/static-module.js"

type ProprietaryModuleSyntax = "star" | "superModule" | "tilde"

function getProprietaryRequireSyntax(requirePath: string): ProprietaryModuleSyntax | undefined {
  if (requirePath.startsWith("*/")) {
    return "star"
  }

  if (requirePath.startsWith("~/")) {
    return "tilde"
  }

  return undefined
}

function getExplicitCartridgeMatch(
  requirePath: string,
  cartridgeRoots: string[],
): { cartridgeRoot: string; explicitPath: string } | undefined {
  if (!requirePath.startsWith("*/")) {
    return undefined
  }

  const relativePath = requirePath.slice(2)
  const matchingRoots = cartridgeRoots.filter((cartridgeRoot) =>
    resolveCandidateFile(path.join(cartridgeRoot, relativePath), requirePath),
  )

  if (matchingRoots.length !== 1) {
    return undefined
  }

  const cartridgeRoot = matchingRoots[0] as string
  return {
    cartridgeRoot,
    explicitPath: `${path.basename(cartridgeRoot)}/${relativePath}`,
  }
}

function isLocallyDefinedModule(context: Rule.RuleContext, node: Rule.Node): boolean {
  let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(
    node as never,
  )

  while (scope) {
    const moduleVariable = scope.variables.find((variable) => variable.name === "module")
    if (moduleVariable) {
      return moduleVariable.defs.length > 0
    }

    scope = scope.upper
  }

  return false
}

function isSuperModuleAccess(node: Rule.Node): boolean {
  if (node.type !== "MemberExpression" || node.object.type !== "Identifier") {
    return false
  }

  if (node.object.name !== "module") {
    return false
  }

  return node.computed
    ? node.property.type === "Literal" && node.property.value === "superModule"
    : node.property.type === "Identifier" && node.property.name === "superModule"
}

const noProprietaryModuleSyntax: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow configurable SFCC-specific module syntax.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-proprietary-module-syntax",
      recommended: false,
    },
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: { enum: ["star", "superModule", "tilde"] },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      proprietaryRequirePath:
        'The "{{syntax}}" require path syntax in "{{requirePath}}" is SFCC-specific and is not allowed by this project.',
      proprietarySuperModule:
        'The "module.superModule" syntax is SFCC-specific and is not allowed by this project.',
      replaceWithExplicitCartridge: 'Replace with the explicit cartridge path "{{explicitPath}}".',
      replaceWithLocalCartridge: 'Replace with the local cartridge path "{{localPath}}".',
    },
  },
  create: withSfccSettings((context, sfccSettings) => {
    const options = context.options[0] as { allow?: ProprietaryModuleSyntax[] } | undefined
    const allowedSyntax = new Set(options?.allow ?? [])
    const cwd =
      (context as Rule.RuleContext & { cwd?: string }).cwd ??
      (context as Rule.RuleContext & { getCwd?: () => string }).getCwd?.() ??
      process.cwd()
    const cartridgeRoots = inferCartridgeOrder({
      cartridgesDir: sfccSettings.cartridgesDir ?? "cartridges",
      cwd,
      cartridgePath: sfccSettings.cartridgePath,
      siteTemplatePath: sfccSettings.siteTemplatePath,
      site: sfccSettings.site,
      solutionConfigPath: sfccSettings.solutionConfigPath,
      envCartridgePath: sfccSettings.envCartridgePath,
    })
    const filename =
      (context as Rule.RuleContext & { filename?: string }).filename ??
      (context as Rule.RuleContext & { getFilename?: () => string }).getFilename?.() ??
      "<input>"
    const normalizedFilename = path.isAbsolute(filename) ? filename : path.resolve(cwd, filename)
    const containingCartridgeRoot = findContainingCartridgeRoot(normalizedFilename, cartridgeRoots)

    return {
      CallExpression(node) {
        const callNode = node as Rule.Node & {
          callee?: { type?: string; name?: string }
          arguments?: Rule.Node[]
        }

        if (callNode.callee?.type !== "Identifier" || callNode.callee.name !== "require") {
          return
        }

        const requirePath = getStaticModulePath(callNode.arguments?.[0])
        if (requirePath === undefined) {
          return
        }

        const syntax = getProprietaryRequireSyntax(requirePath)
        if (syntax === undefined || allowedSyntax.has(syntax)) {
          return
        }

        const reportNode = callNode.arguments?.[0] ?? node
        const explicitMatch = getExplicitCartridgeMatch(requirePath, cartridgeRoots)
        const literalText = context.sourceCode.getText(reportNode)
        const replaceStarPrefix = (replacement: string): string =>
          `${literalText.slice(0, 1)}${replacement}${literalText.slice(2)}`
        const suggestions: Rule.SuggestionReportDescriptor[] = []

        if (
          explicitMatch?.cartridgeRoot === containingCartridgeRoot &&
          allowedSyntax.has("tilde")
        ) {
          suggestions.push({
            messageId: "replaceWithLocalCartridge",
            data: { localPath: `~/${requirePath.slice(2)}` },
            fix: (fixer) => fixer.replaceText(reportNode, replaceStarPrefix("~")),
          })
        }

        if (explicitMatch) {
          suggestions.push({
            messageId: "replaceWithExplicitCartridge",
            data: { explicitPath: explicitMatch.explicitPath },
            fix: (fixer) =>
              fixer.replaceText(
                reportNode,
                replaceStarPrefix(path.basename(explicitMatch.cartridgeRoot)),
              ),
          })
        }

        context.report({
          node: reportNode,
          messageId: "proprietaryRequirePath",
          data: { syntax, requirePath },
          suggest: suggestions.length > 0 ? suggestions : undefined,
        })
      },
      MemberExpression(node) {
        if (
          allowedSyntax.has("superModule") ||
          !isSuperModuleAccess(node) ||
          isLocallyDefinedModule(context, node)
        ) {
          return
        }

        context.report({
          node,
          messageId: "proprietarySuperModule",
        })
      },
    }
  }),
}

export default noProprietaryModuleSyntax
