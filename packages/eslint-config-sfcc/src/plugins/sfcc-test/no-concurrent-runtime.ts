import type { Rule } from "eslint"

import { getStaticMemberName } from "../_utils/ast.js"
import { getStaticModulePath } from "../_utils/static-module.js"
import { createSfccModuleCheck, isValueImport, isVitestTestApi, runtimeSources } from "./utils.js"

const noConcurrentRuntime: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow concurrent tests and suites that share SFCC runtime state.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-concurrent-runtime",
    },
    schema: [],
    messages: {
      concurrent:
        "SFCC runtime state is shared within a worker. Run these tests sequentially instead of using concurrent.",
    },
  },
  create(context) {
    let usesRuntime = false
    const concurrent: Rule.Node[] = []
    const isSfccModule = createSfccModuleCheck(context)
    return {
      ImportDeclaration(node) {
        if (isValueImport(node) && typeof node.source.value === "string") {
          usesRuntime ||= runtimeSources.has(node.source.value) || isSfccModule(node.source.value)
        }
      },
      ImportExpression(node) {
        const source = getStaticModulePath(node.source as Rule.Node)
        if (source) {
          usesRuntime ||= runtimeSources.has(source) || isSfccModule(source)
        }
      },
      MemberExpression(node) {
        if (
          getStaticMemberName(node) === "concurrent" &&
          isVitestTestApi(context, node.object as Rule.Node)
        ) {
          concurrent.push(node)
        }
      },
      "Program:exit"() {
        if (usesRuntime) {
          for (const node of concurrent) {
            context.report({ node, messageId: "concurrent" })
          }
        }
      },
    }
  },
}

export default noConcurrentRuntime
