import type { Rule } from "eslint"

const COLLECTION_ALTERNATIVES = {
  "dw/util/ArrayList": "Array",
  "dw/util/HashMap": "Map",
  "dw/util/HashSet": "Set",
  "dw/util/LinkedHashSet": "Set",
} as const

type CollectionPath = keyof typeof COLLECTION_ALTERNATIVES

function getStaticRequirePath(node: Rule.Node | undefined): string | undefined {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value
  }

  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined
  }

  return undefined
}

function isCollectionPath(requirePath: string): requirePath is CollectionPath {
  return Object.hasOwn(COLLECTION_ALTERNATIVES, requirePath)
}

const preferNativeCollections: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer standard JavaScript collections over explicitly imported SFCC collection implementations.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/prefer-native-collections",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: { enum: Object.keys(COLLECTION_ALTERNATIVES) },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferNativeCollection:
        'Prefer the standard JavaScript "{{alternative}}" collection over "{{requirePath}}".',
    },
  },
  create(context) {
    const options = context.options[0] as { allow?: string[] } | undefined
    const allowedPaths = new Set(options?.allow ?? [])

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
        if (!requirePath || !isCollectionPath(requirePath) || allowedPaths.has(requirePath)) {
          return
        }

        context.report({
          node: callNode.arguments?.[0] ?? node,
          messageId: "preferNativeCollection",
          data: {
            alternative: COLLECTION_ALTERNATIVES[requirePath],
            requirePath,
          },
        })
      },
    }
  },
}

export default preferNativeCollections
