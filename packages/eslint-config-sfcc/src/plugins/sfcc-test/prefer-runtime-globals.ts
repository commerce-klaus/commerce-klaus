import type { Rule } from "eslint"

import { getStaticMemberName } from "../_utils/ast.js"
import { getStaticModulePath } from "../_utils/static-module.js"
import { isGlobalIdentifier, isVitestApi } from "./utils.js"

const globals = new Set(["customer", "request", "response", "session", "empty"])

const preferRuntimeGlobals: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Manage SFCC test globals through the runtime rather than global objects.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/prefer-runtime-globals",
    },
    schema: [],
    messages: {
      runtimeGlobal:
        'Manage the SFCC global "{{name}}" with runtime.setGlobals(), getGlobal(), or unsetGlobals() so runtime.reset() can restore it.',
    },
  },
  create(context) {
    function isGlobalObject(node: Rule.Node | undefined): boolean {
      return (
        node?.type === "Identifier" &&
        ["globalThis", "global"].includes(node.name) &&
        isGlobalIdentifier(context, node)
      )
    }

    function report(node: Rule.Node, name: string | undefined) {
      if (name && globals.has(name)) {
        context.report({ node, messageId: "runtimeGlobal", data: { name } })
      }
    }

    return {
      MemberExpression(node) {
        if (isGlobalObject(node.object as Rule.Node)) {
          report(node, getStaticMemberName(node))
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") {
          return
        }
        const callee = node.callee
        const method = getStaticMemberName(callee as Rule.Node)
        const object = callee.object as Rule.Node
        if (method === "stubGlobal" && isVitestApi(context, object, ["vi", "vitest"])) {
          report(node, getStaticModulePath(node.arguments[0] as Rule.Node | undefined))
          return
        }
        if (
          object.type !== "Identifier" ||
          !isGlobalIdentifier(context, object) ||
          !isGlobalObject(node.arguments[0] as Rule.Node | undefined)
        ) {
          return
        }
        const keyedMethods =
          object.name === "Reflect"
            ? ["get", "set", "has", "deleteProperty", "defineProperty", "getOwnPropertyDescriptor"]
            : object.name === "Object"
              ? ["defineProperty", "getOwnPropertyDescriptor", "hasOwn"]
              : []
        if (method && keyedMethods.includes(method)) {
          report(node, getStaticModulePath(node.arguments[1] as Rule.Node | undefined))
        } else if (
          object.name === "Object" &&
          ["assign", "defineProperties"].includes(method ?? "")
        ) {
          for (const argument of node.arguments.slice(1)) {
            if (argument.type !== "ObjectExpression") {
              continue
            }
            for (const property of argument.properties) {
              if (property.type !== "Property") {
                continue
              }
              const name =
                !property.computed && property.key.type === "Identifier"
                  ? property.key.name
                  : getStaticModulePath(property.key as Rule.Node)
              report(property as Rule.Node, name)
            }
          }
        }
      },
    }
  },
}

export default preferRuntimeGlobals
