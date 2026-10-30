import type { Rule } from "eslint"

import { findVariable, getTestSuite, isRuntimeApi, isVitestApi, isVitestTestApi } from "./utils.js"

const noStaleRuntimeReference: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid captured active runtime references replaced by beforeEach.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-stale-runtime-reference",
    },
    schema: [],
    messages: {
      stale:
        '"{{name}}" captures the active runtime before beforeEach() replaces it. Get the runtime inside the test/hook, or assign resetSfccRuntime() to a shared binding in beforeEach().',
    },
  },
  create(context) {
    const bindings: Rule.Node[] = []
    const replacements = new Set<Rule.Node>()

    function callbackCall(node: Rule.Node): Rule.Node | undefined {
      let ancestor = node.parent
      while (ancestor) {
        if (
          ancestor.type === "ArrowFunctionExpression" ||
          ancestor.type === "FunctionExpression" ||
          ancestor.type === "FunctionDeclaration"
        ) {
          return ancestor.type !== "FunctionDeclaration" &&
            ancestor.parent.type === "CallExpression" &&
            ancestor.parent.arguments.some((argument) => argument === ancestor)
            ? ancestor.parent
            : undefined
        }
        ancestor = ancestor.parent
      }
      return undefined
    }

    function directRegistration(node: Rule.Node): boolean {
      const statement = node.parent
      const container = statement?.parent
      return (
        statement?.type === "ExpressionStatement" &&
        (container?.type === "Program" ||
          (container?.type === "BlockStatement" &&
            container.parent === getTestSuite(context, node)))
      )
    }

    return {
      VariableDeclarator(node) {
        if (
          node.id.type !== "Identifier" ||
          node.init?.type !== "CallExpression" ||
          node.init.optional ||
          !isRuntimeApi(context, node.init.callee as Rule.Node, [
            "getSfccRuntime",
            "getSfccTestRuntime",
          ]) ||
          node.parent.type !== "VariableDeclaration" ||
          node.parent.kind !== "const"
        ) {
          return
        }
        const container = node.parent.parent
        if (
          container.type === "Program" ||
          (container.type === "BlockStatement" && container.parent === getTestSuite(context, node))
        ) {
          bindings.push(node.id as Rule.Node)
        }
      },
      CallExpression(node) {
        if (
          node.optional ||
          !isRuntimeApi(context, node.callee as Rule.Node, ["resetSfccRuntime"])
        ) {
          return
        }
        const hook = callbackCall(node)
        if (
          !hook ||
          hook.type !== "CallExpression" ||
          hook.optional ||
          (hook.callee.type === "MemberExpression" && hook.callee.optional) ||
          !isVitestApi(context, hook.callee as Rule.Node, ["beforeEach"]) ||
          !directRegistration(hook)
        ) {
          return
        }
        const callback = hook.arguments[0]
        if (
          callback?.type !== "ArrowFunctionExpression" &&
          callback?.type !== "FunctionExpression"
        ) {
          return
        }
        let statement: Rule.Node = node
        while (
          statement.parent &&
          statement.parent !== callback.body &&
          statement !== callback.body
        ) {
          if (
            ![
              "AssignmentExpression",
              "VariableDeclarator",
              "VariableDeclaration",
              "ExpressionStatement",
            ].includes(statement.parent.type)
          ) {
            return
          }
          statement = statement.parent
        }
        if (statement === callback.body || statement.parent === callback.body) {
          if (
            callback.body.type === "BlockStatement" &&
            callback.body.body
              .slice(
                0,
                callback.body.body.findIndex((entry) => entry === statement),
              )
              .some(
                (previous) =>
                  !["ExpressionStatement", "VariableDeclaration", "EmptyStatement"].includes(
                    previous.type,
                  ),
              )
          ) {
            return
          }
          replacements.add(getTestSuite(context, hook))
        }
      },
      "Program:exit"() {
        for (const binding of bindings) {
          if (binding.type !== "Identifier") {
            continue
          }
          const variable = findVariable(context, binding, binding.name)
          for (const reference of variable?.references ?? []) {
            if (!reference.isRead()) {
              continue
            }
            const node = reference.identifier as Rule.Node
            const call = callbackCall(node)
            if (
              !call ||
              call.type !== "CallExpression" ||
              !(
                isVitestTestApi(context, call.callee as Rule.Node, ["it", "test"]) ||
                isVitestApi(context, call.callee as Rule.Node, ["afterEach"])
              )
            ) {
              continue
            }
            let scope = getTestSuite(context, node)
            while (true) {
              if (replacements.has(scope)) {
                context.report({ node, messageId: "stale", data: { name: binding.name } })
                break
              }
              if (scope.type === "Program") {
                break
              }
              scope = getTestSuite(context, scope)
            }
          }
        }
      },
    }
  },
}

export default noStaleRuntimeReference
