import type { Rule } from "eslint"

import {
  findOperationByOperationId,
  getRequiredCustomApiExportsForScriptFile,
  loadOasDocument,
  resolveOasRequestBody,
  schemaContainsAdditionalProperties,
} from "@commerce-klaus/sfcc-module-resolver"

import { isJavaScriptTarget } from "../_utils/commonjs-exports.ts"

const noCustomApiAdditionalProperties: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallows additionalProperties in Custom API request body schemas, since the platform does not register such endpoints.",
      url: "https://github.com/commerce-klaus/commerce-klaus/blob/main/packages/eslint-config-sfcc/docs/rules/sfcc/no-custom-api-additional-properties.md",
      recommended: true,
    },
    schema: [],
    messages: {
      additionalPropertiesNotAllowed:
        'Custom API endpoint "{{operationId}}" request body schema must not declare "additionalProperties"; the platform does not register such endpoints.',
    },
  },
  create(context): Rule.RuleListener {
    if (!isJavaScriptTarget(context.filename)) {
      return {}
    }

    return {
      "Program:exit"(node) {
        const requiredExports = getRequiredCustomApiExportsForScriptFile(context.filename)

        for (const { operationId, schemaPath } of requiredExports) {
          const document = loadOasDocument(schemaPath)
          const match = document && findOperationByOperationId(document, operationId)
          if (!document || !match) {
            continue
          }

          const requestBody = resolveOasRequestBody(match.operation.requestBody, document)
          const requestBodySchema = requestBody?.content?.["application/json"]?.schema

          if (schemaContainsAdditionalProperties(requestBodySchema, document)) {
            context.report({
              node: node as unknown as Rule.Node,
              messageId: "additionalPropertiesNotAllowed",
              data: { operationId },
            })
          }
        }
      },
    }
  },
}

export default noCustomApiAdditionalProperties
