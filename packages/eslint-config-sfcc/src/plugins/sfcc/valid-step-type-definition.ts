import type { Rule } from "eslint"
import type { AST } from "jsonc-eslint-parser"

import { parseStepTypeDefinitionsFromDocument } from "@commerce-klaus/sfcc-module-resolver/job-steps"
import { getStaticJSONValue } from "jsonc-eslint-parser"

function findDiagnosticNode(program: AST.JSONProgram, diagnosticPath: string): AST.JSONNode {
  const match = /^step-types\.(script-module-step|chunk-script-module-step)\[(\d+)]$/.exec(
    diagnosticPath,
  )
  const root = program.body[0]?.expression
  if (!match || root?.type !== "JSONObjectExpression") {
    return root ?? program
  }

  const stepTypes = root.properties.find(
    (property) => property.key.type === "JSONLiteral" && property.key.value === "step-types",
  )?.value
  if (stepTypes?.type !== "JSONObjectExpression") {
    return root
  }

  const field = stepTypes.properties.find(
    (property) => property.key.type === "JSONLiteral" && property.key.value === match[1],
  )?.value
  if (field?.type !== "JSONArrayExpression") {
    return stepTypes
  }

  return field.elements[Number(match[2])] ?? field
}

const validStepTypeDefinition: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Reports invalid job step definitions in steptypes.json.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc/valid-step-type-definition",
      recommended: true,
    },
    schema: [],
    messages: {
      invalidDefinition: "{{path}}: {{message}}",
    },
  },
  create(context): Rule.RuleListener {
    if (!context.filename.endsWith("steptypes.json")) {
      return {}
    }

    return {
      "Program:exit"(node) {
        const program = node as unknown as AST.JSONProgram
        const result = parseStepTypeDefinitionsFromDocument(getStaticJSONValue(program))
        for (const diagnostic of result.diagnostics) {
          context.report({
            node: findDiagnosticNode(program, diagnostic.path) as unknown as Rule.Node,
            messageId: "invalidDefinition",
            data: diagnostic,
          })
        }
      },
    }
  },
}

export default validStepTypeDefinition
