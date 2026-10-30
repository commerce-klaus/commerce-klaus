import type { Rule } from "eslint"

import { getStaticMemberName } from "../_utils/ast.js"
import { getStaticModulePath } from "../_utils/static-module.js"
import { createSfccModuleCheck, isRuntimeSetup, isVitestMockApi } from "./utils.js"

const noHoistedRuntimeMock: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Keep SFCC runtime setup out of hoisted Vitest mock factories.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-hoisted-runtime-mock",
    },
    schema: [],
    messages: {
      hoistedSetup:
        "Do not configure the SFCC runtime inside vi.hoisted() or a vi.mock() factory. Set up the runtime in a lifecycle hook or test before dynamically importing cartridge code.",
      hoistedImport:
        "Do not load SFCC modules inside vi.hoisted(). Import them in a lifecycle hook or test after runtime setup.",
    },
  },
  create(context) {
    const factories = new Set<Rule.Node>()
    const setups: Rule.Node[] = []
    const hoistedFactories = new Set<Rule.Node>()
    const imports: Rule.Node[] = []
    const isSfccModule = createSfccModuleCheck(context)
    return {
      CallExpression(node) {
        if (isVitestMockApi(context, node.callee as Rule.Node)) {
          const index = getStaticMemberName(node.callee as Rule.Node) === "hoisted" ? 0 : 1
          const factory = node.arguments[index]
          if (
            factory?.type === "ArrowFunctionExpression" ||
            factory?.type === "FunctionExpression"
          ) {
            factories.add(factory as Rule.Node)
            if (index === 0) {
              hoistedFactories.add(factory as Rule.Node)
            }
          }
        }
        if (isRuntimeSetup(context, node)) {
          setups.push(node)
        }
      },
      ImportExpression(node) {
        const source = getStaticModulePath(node.source as Rule.Node)
        if (source && isSfccModule(source)) {
          imports.push(node)
        }
      },
      "Program:exit"() {
        for (const node of [...setups, ...imports]) {
          const importing = node.type === "ImportExpression"
          const targets = importing ? hoistedFactories : factories
          let ancestor = node.parent
          while (ancestor) {
            if (targets.has(ancestor)) {
              context.report({ node, messageId: importing ? "hoistedImport" : "hoistedSetup" })
              break
            }
            if (
              ancestor.type === "ArrowFunctionExpression" ||
              ancestor.type === "FunctionExpression" ||
              ancestor.type === "FunctionDeclaration"
            ) {
              break
            }
            ancestor = ancestor.parent
          }
        }
      },
    }
  },
}

export default noHoistedRuntimeMock
