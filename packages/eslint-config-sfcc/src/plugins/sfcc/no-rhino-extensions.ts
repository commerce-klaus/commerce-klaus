import type { Rule } from "eslint"

const RHINO_GLOBALS = new Set([
  "Iterator",
  "JavaAdapter",
  "JavaImporter",
  "Packages",
  "StopIteration",
  "java",
  "javax",
])

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

const noRhinoExtensions: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow Rhino-specific runtime globals in portable JavaScript.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-rhino-extensions",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: {
              enum: [
                "Iterator",
                "JavaAdapter",
                "JavaImporter",
                "Packages",
                "StopIteration",
                "java",
                "javax",
              ],
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rhinoGlobal:
        'The Rhino-specific global "{{name}}" is not standard JavaScript and is not allowed by this project.',
    },
  },
  create(context) {
    const options = context.options[0] as { allow?: string[] } | undefined
    const allowedGlobals = new Set(options?.allow ?? [])

    return {
      Identifier(node) {
        if (
          RHINO_GLOBALS.has(node.name) &&
          !allowedGlobals.has(node.name) &&
          isGlobalReference(context, node)
        ) {
          context.report({
            node,
            messageId: "rhinoGlobal",
            data: { name: node.name },
          })
        }
      },
    }
  },
}

export default noRhinoExtensions
