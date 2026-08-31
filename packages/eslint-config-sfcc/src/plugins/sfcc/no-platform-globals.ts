import type { Rule } from "eslint"

const PLATFORM_GLOBALS = new Set(["customer", "request", "response", "session"])

function isGlobalReference(context: Rule.RuleContext, node: Rule.Node): boolean {
  let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(
    node as never,
  )

  while (scope) {
    const reference = scope.references.find((item) => item.identifier === node)
    if (reference) {
      return reference.resolved === null || reference.resolved.defs.length === 0
    }

    scope = scope.upper
  }

  return false
}

const noPlatformGlobals: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow stateful SFCC platform globals in favor of explicit dependencies.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-platform-globals",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: { enum: ["customer", "request", "response", "session"] },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      platformGlobal:
        'The SFCC platform global "{{name}}" is not allowed. Pass this dependency explicitly instead.',
    },
  },
  create(context) {
    const options = context.options[0] as { allow?: string[] } | undefined
    const allowedGlobals = new Set(options?.allow ?? [])

    return {
      Identifier(node) {
        if (
          PLATFORM_GLOBALS.has(node.name) &&
          !allowedGlobals.has(node.name) &&
          isGlobalReference(context, node)
        ) {
          context.report({
            node,
            messageId: "platformGlobal",
            data: { name: node.name },
          })
        }
      },
    }
  },
}

export default noPlatformGlobals
