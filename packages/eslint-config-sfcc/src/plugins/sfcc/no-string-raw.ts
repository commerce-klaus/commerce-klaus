import type { Rule, Scope } from "eslint"

type StringRawMember = Rule.Node & {
  computed: boolean
  object: Rule.Node
  property: Rule.Node
}

type StaticStringRawTemplate = Rule.Node & {
  expressions: Rule.Node[]
  quasis: Array<Rule.Node & { value: { raw: string } }>
}

function isGlobalStringIdentifier(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "Identifier" || node.name !== "String") {
    return false
  }

  let scope: Scope.Scope | null = context.sourceCode.getScope(node)
  while (scope) {
    const variable = scope.set.get("String")
    if (variable) {
      return variable.defs.length === 0
    }
    scope = scope.upper
  }

  return true
}

function isRawProperty(node: Rule.Node): boolean {
  if (node.type === "Identifier") {
    return node.name === "raw"
  }

  return node.type === "Literal" && node.value === "raw"
}

function isStringRawMember(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "MemberExpression") {
    return false
  }

  const member = node as StringRawMember
  if (!isGlobalStringIdentifier(context, member.object)) {
    return false
  }

  if (member.computed) {
    return member.property.type === "Literal" && member.property.value === "raw"
  }

  return isRawProperty(member.property)
}

function getStaticTemplateReplacement(node: Rule.Node): string | undefined {
  if (node.type !== "TaggedTemplateExpression") {
    return undefined
  }

  const template = node.quasi as StaticStringRawTemplate
  if (template.expressions.length > 0) {
    return undefined
  }

  return JSON.stringify(template.quasis[0]?.value.raw ?? "")
}

const noStringRaw: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow String.raw because affected SFCC Rhino versions can expose its result as an internal ConsString to Java APIs.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/no-string-raw",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      unsafeStringRaw:
        "Avoid String.raw in SFCC server-side code because Rhino may expose its result as an incompatible ConsString.",
    },
  },
  create(context) {
    function report(node: Rule.Node, member: Rule.Node) {
      const replacement = getStaticTemplateReplacement(node)

      context.report({
        node: member,
        messageId: "unsafeStringRaw",
        ...(replacement === undefined
          ? {}
          : { fix: (fixer) => fixer.replaceText(node, replacement) }),
      })
    }

    return {
      CallExpression(node) {
        const callee = node.callee as Rule.Node
        if (isStringRawMember(context, callee)) {
          report(node, callee)
        }
      },
      TaggedTemplateExpression(node) {
        const tag = node.tag as Rule.Node
        if (isStringRawMember(context, tag)) {
          report(node, tag)
        }
      },
    }
  },
}

export default noStringRaw
