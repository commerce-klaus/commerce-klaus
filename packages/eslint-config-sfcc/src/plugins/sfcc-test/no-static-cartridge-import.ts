import type { Rule } from "eslint"

import { createSfccModuleCheck, isRuntimeSetup, isValueImport } from "./utils.js"

const noStaticCartridgeImport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Import SFCC modules dynamically when tests configure runtime state.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-static-cartridge-import",
    },
    schema: [],
    messages: {
      staticImport:
        "This SFCC module is evaluated before runtime setup. Register mocks and globals first, then use await import().",
    },
  },
  create(context) {
    let hasRuntimeSetup = false
    const imports: Rule.Node[] = []
    const isSfccModule = createSfccModuleCheck(context)
    return {
      ImportDeclaration(node) {
        if (
          isValueImport(node) &&
          typeof node.source.value === "string" &&
          isSfccModule(node.source.value)
        ) {
          imports.push(node)
        }
      },
      CallExpression(node) {
        hasRuntimeSetup ||= isRuntimeSetup(context, node)
      },
      "Program:exit"() {
        if (hasRuntimeSetup) {
          for (const node of imports) {
            context.report({ node, messageId: "staticImport" })
          }
        }
      },
    }
  },
}

export default noStaticCartridgeImport
