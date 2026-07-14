import type { Rule } from "eslint"

import {
  createSfccModuleResolver,
  inferCartridgeOrder,
  resolveCartridgesDir,
} from "@commerce-klaus/sfcc-module-resolver"
import fs from "node:fs"
import path from "node:path"

import { withSfccSettings } from "../_utils/sfcc-settings.js"
import { getTypeTextForNode } from "../_utils/type-aware.js"

function getStringArgument(node: Rule.Node): string | undefined {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined
  }

  return undefined
}

function getLiteralStringFromTypeText(typeText: string): string | undefined {
  const trimmed = typeText.trim()
  const singleQuoted = /^'([^'\\]|\\.)*'$/u
  const doubleQuoted = /^"([^"\\]|\\.)*"$/u
  const backtickQuoted = /^`([^`\\]|\\.)*`$/u

  if (!singleQuoted.test(trimmed) && !doubleQuoted.test(trimmed) && !backtickQuoted.test(trimmed)) {
    return undefined
  }

  try {
    if (doubleQuoted.test(trimmed)) {
      return JSON.parse(trimmed) as string
    }

    if (backtickQuoted.test(trimmed)) {
      if (trimmed.includes("${")) {
        return undefined
      }

      const body = trimmed.slice(1, -1)
      const normalized = `"${body.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`
      return JSON.parse(normalized) as string
    }

    const body = trimmed.slice(1, -1)
    const normalized = `"${body.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`
    return JSON.parse(normalized) as string
  } catch {
    return undefined
  }
}

function getTypeAwareStringArgument(
  context: Rule.RuleContext,
  node: Rule.Node,
): string | undefined {
  if (node.type !== "Identifier") {
    return undefined
  }
  const typeText = getTypeTextForNode(context, node)
  if (!typeText) {
    return undefined
  }

  return getLiteralStringFromTypeText(typeText)
}

function isAllowedPrefix(requirePath: string): boolean {
  return (
    requirePath.startsWith("dw/") ||
    requirePath.startsWith("./") ||
    requirePath.startsWith("../") ||
    requirePath.startsWith("*/") ||
    requirePath.startsWith("~/")
  )
}

function isCartridgeStylePath(requirePath: string): boolean {
  return /^[A-Za-z0-9_-]+\/.+/u.test(requirePath)
}

function getFirstSegment(requirePath: string): string {
  const slashIndex = requirePath.indexOf("/")
  return slashIndex === -1 ? requirePath : requirePath.slice(0, slashIndex)
}

function getConfiguredCartridgePath(cartridgePath: string[] | undefined): string[] {
  if (!cartridgePath) {
    return []
  }

  return cartridgePath.filter((entry) => entry.trim().length > 0)
}

function normalizeFilename(filename: string, cwd: string): string {
  if (filename === "<input>") {
    return filename
  }

  return path.isAbsolute(filename) ? filename : path.resolve(cwd, filename)
}

function cartridgeExists(cartridgeName: string, cartridgesDir: string, cwd: string): boolean {
  const baseDir = resolveCartridgesDir(cartridgesDir, cwd)
  const cartridgeRoot = path.join(baseDir, cartridgeName)

  try {
    return fs.statSync(cartridgeRoot).isDirectory()
  } catch {
    return false
  }
}

const validRequirePath: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce SFCC-compatible require paths (dw/, relative, cartridge-name/, */, ~/).",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/valid-require-path.md",
      recommended: true,
    },
    // Shared sfcc configuration is provided via ESLint settings.sfcc.
    schema: [],
    messages: {
      invalidPath:
        'Invalid require path "{{requirePath}}". Allowed: dw/*, cartridgeName/*, ./*, ../*, */*, ~/* or configured bare modules.',
      unknownCartridge:
        'Unknown cartridge "{{cartridgeName}}" in require path "{{requirePath}}" (checked in "{{cartridgesDir}}/").',
      unresolvedStarPath:
        'Cannot resolve "{{requirePath}}" against configured cartridges in "{{cartridgesDir}}/".',
      unresolvedTildePath:
        'Cannot resolve "{{requirePath}}" in current cartridge (checked in "{{cartridgesDir}}/").',
    },
  },
  create: withSfccSettings((context, options) => {
    const allowBareModules = new Set(options.allowBareModules ?? ["server"])
    const checkCartridgeExists = options.checkCartridgeExists === true
    const cartridgesDir = options.cartridgesDir ?? "cartridges"
    const cwd =
      (context as Rule.RuleContext & { cwd?: string }).cwd ??
      (context as Rule.RuleContext & { getCwd?: () => string }).getCwd?.() ??
      process.cwd()
    const configuredCartridgePath = getConfiguredCartridgePath(options.cartridgePath)
    const cartridgeRoots = inferCartridgeOrder({
      cartridgesDir,
      cwd,
      cartridgePath: configuredCartridgePath,
      siteTemplatePath: options.siteTemplatePath,
      site: options.site,
    })
    const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
    const filename =
      (context as Rule.RuleContext & { filename?: string }).filename ??
      (context as Rule.RuleContext & { getFilename?: () => string }).getFilename?.() ??
      "<input>"
    const normalizedFilename = normalizeFilename(filename, cwd)

    return {
      CallExpression(node) {
        const callNode = node as Rule.Node & {
          callee?: { type?: string; name?: string }
          arguments?: Rule.Node[]
        }

        if (callNode.callee?.type !== "Identifier" || callNode.callee.name !== "require") {
          return
        }

        const firstArgument = callNode.arguments?.[0]
        if (!firstArgument) {
          return
        }

        const requirePath =
          getStringArgument(firstArgument) ?? getTypeAwareStringArgument(context, firstArgument)
        if (!requirePath) {
          return
        }

        if (requirePath.startsWith("*/")) {
          if (checkCartridgeExists && !resolveSfccModule(requirePath, normalizedFilename)) {
            context.report({
              node: firstArgument,
              messageId: "unresolvedStarPath",
              data: { requirePath, cartridgesDir },
            })
          }
          return
        }

        if (requirePath.startsWith("~/")) {
          if (checkCartridgeExists && !resolveSfccModule(requirePath, normalizedFilename)) {
            context.report({
              node: firstArgument,
              messageId: "unresolvedTildePath",
              data: { requirePath, cartridgesDir },
            })
          }
          return
        }

        if (isAllowedPrefix(requirePath)) {
          return
        }

        if (!requirePath.includes("/")) {
          if (!allowBareModules.has(requirePath)) {
            context.report({
              node: firstArgument,
              messageId: "invalidPath",
              data: { requirePath },
            })
          }
          return
        }

        if (!isCartridgeStylePath(requirePath)) {
          context.report({
            node: firstArgument,
            messageId: "invalidPath",
            data: { requirePath },
          })
          return
        }

        if (!checkCartridgeExists) {
          return
        }

        const cartridgeName = getFirstSegment(requirePath)
        if (!cartridgeExists(cartridgeName, cartridgesDir, cwd)) {
          context.report({
            node: firstArgument,
            messageId: "unknownCartridge",
            data: { cartridgeName, requirePath, cartridgesDir },
          })
        }
      },
    }
  }),
}

export default validRequirePath
