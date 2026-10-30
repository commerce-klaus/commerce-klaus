import type { Rule } from "eslint"

import { getStaticMemberName } from "../_utils/ast.js"
import {
  getRuntimeOwner,
  getTestSuite,
  isRuntimeApi,
  isVitestApi,
  type RuntimeOwner,
} from "./utils.js"

const requireRuntimeCleanup: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require afterEach runtime cleanup for locally visible SFCC test state.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/require-runtime-cleanup",
    },
    schema: [
      {
        type: "object",
        properties: { externalCleanup: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    messages: {
      cleanup:
        "Reset the affected runtime in afterEach() in this suite or an enclosing scope (for the active runtime: getSfccRuntime().reset()). Vitest mock/module resets and resetSfccRuntime() do not clean up the previous runtime. If setupFiles provides cleanup, configure externalCleanup: true.",
    },
  },
  create(context) {
    type Owner = RuntimeOwner
    const options = context.options[0] as { externalCleanup?: boolean } | undefined
    if (options?.externalCleanup) {
      return {}
    }
    const calls: Rule.Node[] = []
    const cleanups = new Map<Rule.Node, Set<Owner>>()
    const mutations = new Map<Rule.Node, Map<Owner, Rule.Node>>()

    function suite(node: Rule.Node): Rule.Node {
      return getTestSuite(context, node)
    }

    function runtimeOwner(node: Rule.Node): Owner | undefined {
      return getRuntimeOwner(context, node)
    }

    function resetOwner(node: Rule.Node): Owner | undefined {
      if (node.type === "AwaitExpression") {
        return resetOwner(node.argument as Rule.Node)
      }
      if (
        node.type !== "CallExpression" ||
        node.optional ||
        node.callee.type !== "MemberExpression" ||
        node.callee.optional ||
        getStaticMemberName(node.callee as Rule.Node) !== "reset"
      ) {
        return undefined
      }
      const receiver = node.callee.object as Rule.Node
      if (receiver.type === "CallExpression") {
        return !receiver.optional &&
          isRuntimeApi(context, receiver.callee as Rule.Node, [
            "getSfccRuntime",
            "getSfccTestRuntime",
          ])
          ? "active"
          : undefined
      }
      return runtimeOwner(receiver)
    }

    function cleanupOwners(node: Rule.Node): Owner[] {
      if (node.type === "BlockStatement") {
        const owners: Owner[] = []
        for (const statement of node.body) {
          owners.push(...cleanupOwners(statement as Rule.Node))
          if (
            !["ExpressionStatement", "VariableDeclaration", "EmptyStatement"].includes(
              statement.type,
            )
          ) {
            break
          }
        }
        return owners
      }
      if (node.type === "ExpressionStatement" || node.type === "ReturnStatement") {
        return node.type === "ExpressionStatement"
          ? cleanupOwners(node.expression as Rule.Node)
          : node.argument !== null
            ? cleanupOwners(node.argument as Rule.Node)
            : []
      }
      if (node.type === "TryStatement" && node.finalizer) {
        return cleanupOwners(node.finalizer as Rule.Node)
      }
      const owner = resetOwner(node)
      return owner === undefined ? [] : [owner]
    }

    function isDirectHook(node: Rule.Node): boolean {
      if (
        node.type !== "CallExpression" ||
        node.optional ||
        (node.callee.type === "MemberExpression" && node.callee.optional)
      ) {
        return false
      }
      const statement = node.parent
      if (statement?.type !== "ExpressionStatement") {
        return false
      }
      const block = statement.parent
      return (
        block?.type === "Program" ||
        (block?.type === "BlockStatement" && block.parent === suite(node))
      )
    }

    return {
      CallExpression(node) {
        calls.push(node)
      },
      "Program:exit"() {
        for (const node of calls) {
          if (node.type !== "CallExpression") {
            continue
          }
          if (isVitestApi(context, node.callee as Rule.Node, ["afterEach"])) {
            const callback = node.arguments[0]
            if (
              (callback?.type === "ArrowFunctionExpression" ||
                callback?.type === "FunctionExpression") &&
              isDirectHook(node)
            ) {
              const scope = suite(node)
              const owners = cleanups.get(scope) ?? new Set<Owner>()
              for (const owner of cleanupOwners(callback.body as Rule.Node)) {
                owners.add(owner)
              }
              cleanups.set(scope, owners)
            }
            continue
          }
          let owner: Owner | undefined
          if (
            node.callee.type === "MemberExpression" &&
            [
              "mock",
              "mockResolved",
              "setGlobals",
              "unsetGlobals",
              "controller",
              "customApi",
              "jobStep",
              "registerHook",
              "callHook",
            ].includes(getStaticMemberName(node.callee as Rule.Node) ?? "")
          ) {
            owner = runtimeOwner(node.callee.object as Rule.Node)
          }
          if (
            isRuntimeApi(context, node.callee as Rule.Node, [
              "resetSfccRuntime",
              "loadSfccCustomApi",
              "loadSfccHook",
              "loadSfccJobStep",
            ])
          ) {
            owner = "active"
          }
          if (isRuntimeApi(context, node.callee as Rule.Node, ["createSfccTestRuntime"])) {
            const parent = node.parent
            owner =
              parent.type === "VariableDeclarator" && parent.id.type === "Identifier"
                ? runtimeOwner(parent.id as Rule.Node)
                : parent.type === "AssignmentExpression" && parent.left.type === "Identifier"
                  ? runtimeOwner(parent.left as Rule.Node)
                  : node
          }
          if (owner !== undefined) {
            const scope = suite(node)
            const uses = mutations.get(scope) ?? new Map<Owner, Rule.Node>()
            if (!uses.has(owner)) {
              uses.set(owner, node)
            }
            mutations.set(scope, uses)
          }
        }
        for (const [scope, uses] of mutations) {
          for (const [owner, node] of uses) {
            let current: Rule.Node = scope
            while (!cleanups.get(current)?.has(owner) && current.type !== "Program") {
              current = suite(current)
            }
            if (!cleanups.get(current)?.has(owner)) {
              context.report({ node, messageId: "cleanup" })
              break
            }
          }
        }
      },
    }
  },
}

export default requireRuntimeCleanup
