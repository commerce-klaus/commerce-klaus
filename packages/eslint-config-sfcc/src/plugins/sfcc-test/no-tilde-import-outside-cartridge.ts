import type { Rule } from "eslint"

import { findContainingCartridgeRoot } from "@commerce-klaus/sfcc-module-resolver/resolution"

import { getStaticModulePath } from "../_utils/static-module.js"
import { getTestModuleResolution, isNativeRequire, isValueImport } from "./utils.js"

const noTildeImportOutsideCartridge: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Use ~/ imports only when the importing test belongs to a configured cartridge.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sfcc-test/no-tilde-import-outside-cartridge",
    },
    schema: [],
    messages: {
      noCartridge:
        "This test is outside the configured cartridges, so ~/ has no cartridge context. Use a relative or named cartridge import, or */ for intentional cartridge-path precedence. Mock identifiers may still use ~/.",
    },
  },
  create(context) {
    let insideCartridge: boolean | undefined
    function check(source: Rule.Node | undefined) {
      if (!source || !getStaticModulePath(source)?.startsWith("~/")) {
        return
      }
      if (insideCartridge === undefined) {
        const { roots, filename } = getTestModuleResolution(context)
        insideCartridge = findContainingCartridgeRoot(filename, roots) !== undefined
      }
      if (!insideCartridge) {
        context.report({ node: source, messageId: "noCartridge" })
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
    }
  },
}

export default noTildeImportOutsideCartridge
