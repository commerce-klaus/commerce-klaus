import type { Rule } from "eslint"

type ProprietaryModuleSyntax = "star" | "superModule" | "tilde"

function getStaticRequirePath(node: Rule.Node | undefined): string | undefined {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value
  }

  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined
  }

  return undefined
}

function getProprietaryRequireSyntax(requirePath: string): ProprietaryModuleSyntax | undefined {
  if (requirePath.startsWith("*/")) {
    return "star"
  }

  if (requirePath.startsWith("~/")) {
    return "tilde"
  }

  return undefined
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
    },
  },
  create(context) {
    const options = context.options[0] as { allow?: ProprietaryModuleSyntax[] } | undefined
    const allowedSyntax = new Set(options?.allow ?? [])

    return {
      CallExpression(node) {
        const callNode = node as Rule.Node & {
          callee?: { type?: string; name?: string }
          arguments?: Rule.Node[]
        }

        if (callNode.callee?.type !== "Identifier" || callNode.callee.name !== "require") {
          return
        }

        const requirePath = getStaticRequirePath(callNode.arguments?.[0])
        if (requirePath === undefined) {
          return
        }

        const syntax = getProprietaryRequireSyntax(requirePath)
        if (syntax === undefined || allowedSyntax.has(syntax)) {
          return
        }

        context.report({
          node: callNode.arguments?.[0] ?? node,
          messageId: "proprietaryRequirePath",
          data: { syntax, requirePath },
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
  },
}

export default noProprietaryModuleSyntax
