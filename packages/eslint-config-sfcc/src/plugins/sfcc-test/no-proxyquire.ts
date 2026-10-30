import type { Rule } from "eslint"

import { getStaticModulePath } from "../_utils/static-module.js"
import { isNativeRequire, isValueImport } from "./utils.js"

const noProxyquire: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Report Proxyquire module loading in favor of SFCC runtime mocks and Vite imports.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-proxyquire",
    },
    schema: [],
    messages: {
      proxyquire:
        "Replace Proxyquire-based loading with SFCC runtime.mock() or mockResolved(), then await import() the module under test. Review call-through and module-cache behavior explicitly.",
    },
  },
  create(context) {
    function check(source: Rule.Node | undefined) {
      const modulePath = getStaticModulePath(source)
      if (source && (modulePath === "proxyquire" || modulePath?.startsWith("proxyquire/"))) {
        context.report({ node: source, messageId: "proxyquire" })
      }
    }

    return {
      ImportDeclaration(node) {
        if (isValueImport(node)) {
          check(node.source as Rule.Node)
        }
      },
      ImportExpression(node) {
        check(node.source as Rule.Node)
      },
      CallExpression(node) {
        if (isNativeRequire(context, node.callee as Rule.Node)) {
          check(node.arguments[0] as Rule.Node | undefined)
        }
      },
      ExportNamedDeclaration(node) {
        const declaration = node as typeof node & { exportKind?: string }
        if (
          declaration.exportKind !== "type" &&
          (node.specifiers.length === 0 ||
            node.specifiers.some(
              (specifier) =>
                (specifier as typeof specifier & { exportKind?: string }).exportKind !== "type",
            ))
        ) {
          check(node.source as Rule.Node | undefined)
        }
      },
      ExportAllDeclaration(node) {
        if ((node as typeof node & { exportKind?: string }).exportKind !== "type") {
          check(node.source as Rule.Node)
        }
      },
    }
  },
}

export default noProxyquire
