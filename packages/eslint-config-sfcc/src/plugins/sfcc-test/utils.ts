import type { Rule } from "eslint"

import {
  createModuleResolver,
  findContainingCartridgeRoot,
  resolveCandidateFile,
  resolveCartridgeRoots,
} from "@commerce-klaus/sfcc-module-resolver/resolution"
import path from "node:path"

import { getStaticMemberName } from "../_utils/ast.js"
import { getRuleCwd, getSfccSettings } from "../_utils/sfcc-settings.js"

export const runtimeSources = new Set([
  "@commerce-klaus/vitest-sfcc",
  "@commerce-klaus/vitest-sfcc/runtime",
  "@commerce-klaus/sfcc-test-runtime",
])

export function findVariable(context: Rule.RuleContext, node: Rule.Node, name: string) {
  let scope: ReturnType<typeof context.sourceCode.getScope> | null =
    context.sourceCode.getScope(node)
  while (scope) {
    const variable = scope.set.get(name)
    if (variable) {
      return variable
    }
    scope = scope.upper
  }
  return undefined
}

export function isGlobalIdentifier(context: Rule.RuleContext, node: Rule.Node): boolean {
  return (
    node.type === "Identifier" && (findVariable(context, node, node.name)?.defs.length ?? 0) === 0
  )
}

function importedBinding(context: Rule.RuleContext, node: Rule.Node) {
  if (node.type !== "Identifier") {
    return undefined
  }
  const definition = findVariable(context, node, node.name)?.defs[0]
  if (definition?.type !== "ImportBinding" || definition.parent.source.value == null) {
    return undefined
  }
  const specifier = definition.node
  if (specifier.type === "ImportSpecifier") {
    return {
      source: String(definition.parent.source.value),
      name:
        specifier.imported.type === "Identifier"
          ? specifier.imported.name
          : String(specifier.imported.value),
    }
  }
  if (specifier.type === "ImportNamespaceSpecifier") {
    return { source: String(definition.parent.source.value), name: "*" }
  }
  return undefined
}

function importedApi(context: Rule.RuleContext, node: Rule.Node) {
  if (node.type === "MemberExpression") {
    const binding = importedBinding(context, node.object as Rule.Node)
    const name = getStaticMemberName(node)
    return binding?.name === "*" && name ? { source: binding.source, name } : undefined
  }
  return importedBinding(context, node)
}

export function isNativeRequire(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "Identifier") {
    return false
  }
  if (node.name === "require" && isGlobalIdentifier(context, node)) {
    return true
  }
  const definition = findVariable(context, node, node.name)?.defs[0]
  if (
    definition?.type !== "Variable" ||
    definition.parent?.kind !== "const" ||
    definition.node.init?.type !== "CallExpression"
  ) {
    return false
  }
  const factory = importedApi(context, definition.node.init.callee as Rule.Node)
  const base = definition.node.init.arguments[0]
  const usesCurrentFile =
    (base?.type === "MemberExpression" &&
      getStaticMemberName(base as Rule.Node) === "url" &&
      base.object.type === "MetaProperty" &&
      base.object.meta.name === "import" &&
      base.object.property.name === "meta") ||
    (base?.type === "Identifier" &&
      base.name === "__filename" &&
      isGlobalIdentifier(context, base as Rule.Node))
  return (
    factory !== undefined &&
    ["node:module", "module"].includes(factory.source) &&
    factory.name === "createRequire" &&
    usesCurrentFile
  )
}

export function getTestModuleResolution(context: Rule.RuleContext) {
  const cwd = getRuleCwd(context)
  const settings = getSfccSettings(context)
  const roots = resolveCartridgeRoots({ ...settings, basePath: settings.cartridgesDir, cwd })
  const filename = path.resolve(cwd, context.filename)
  return { roots, filename }
}

export function isRuntimeFactory(context: Rule.RuleContext, node: Rule.Node): boolean {
  const api = importedApi(context, node)
  return (
    api !== undefined &&
    runtimeSources.has(api.source) &&
    ["getSfccRuntime", "resetSfccRuntime", "getSfccTestRuntime", "createSfccTestRuntime"].includes(
      api.name,
    )
  )
}

export function isRuntime(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type === "CallExpression" && !node.optional) {
    return isRuntimeFactory(context, node.callee as Rule.Node)
  }
  if (node.type === "Identifier") {
    const variable = findVariable(context, node, node.name)
    const definition = variable?.defs[0]
    const writes = variable?.references.filter((reference) => reference.isWrite()) ?? []
    return (
      definition?.type === "Variable" &&
      definition.node.id.type === "Identifier" &&
      writes.length > 0 &&
      writes.every(
        (reference) =>
          reference.writeExpr?.type === "CallExpression" &&
          !reference.writeExpr.optional &&
          isRuntimeFactory(context, reference.writeExpr.callee as Rule.Node),
      )
    )
  }
  return false
}

export type RuntimeOwner = "active" | NonNullable<ReturnType<typeof findVariable>> | Rule.Node

export function getRuntimeOwner(
  context: Rule.RuleContext,
  node: Rule.Node,
): RuntimeOwner | undefined {
  if (!isRuntime(context, node)) {
    return undefined
  }
  if (node.type === "CallExpression") {
    return isRuntimeApi(context, node.callee as Rule.Node, ["createSfccTestRuntime"])
      ? node
      : "active"
  }
  if (node.type !== "Identifier") {
    return undefined
  }
  const variable = findVariable(context, node, node.name)
  if (!variable) {
    return undefined
  }
  const owners = variable.references
    .filter((reference) => reference.isWrite())
    .map((reference) => getRuntimeOwner(context, reference.writeExpr as Rule.Node))
  if (owners.every((owner) => owner === "active")) {
    return "active"
  }
  return owners.every((owner) => owner !== "active") ? variable : undefined
}

export function getTestSuite(context: Rule.RuleContext, node: Rule.Node): Rule.Node {
  let ancestor = node.parent
  while (ancestor) {
    if (
      (ancestor.type === "ArrowFunctionExpression" || ancestor.type === "FunctionExpression") &&
      ancestor.parent.type === "CallExpression" &&
      ancestor.parent.arguments.includes(ancestor) &&
      isVitestTestApi(context, ancestor.parent.callee as Rule.Node, ["describe"])
    ) {
      return ancestor
    }
    if (ancestor.type === "Program") {
      return ancestor
    }
    ancestor = ancestor.parent
  }
  return context.sourceCode.ast as Rule.Node
}

export function isVitestMockApi(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "MemberExpression") {
    return false
  }
  if (!["hoisted", "mock"].includes(getStaticMemberName(node) ?? "")) {
    return false
  }
  return isVitestApi(context, node.object as Rule.Node, ["vi", "vitest"])
}

export function isVitestApi(context: Rule.RuleContext, node: Rule.Node, names: string[]): boolean {
  const api = importedApi(context, node)
  if (api) {
    return ["vitest", "vite-plus/test"].includes(api.source) && names.includes(api.name)
  }
  return (
    node.type === "Identifier" && names.includes(node.name) && isGlobalIdentifier(context, node)
  )
}

export function isRuntimeApi(context: Rule.RuleContext, node: Rule.Node, names: string[]): boolean {
  const api = importedApi(context, node)
  return api !== undefined && runtimeSources.has(api.source) && names.includes(api.name)
}

export function isRuntimeSetup(context: Rule.RuleContext, node: Rule.Node): boolean {
  if (node.type !== "CallExpression") {
    return false
  }
  const api = importedApi(context, node.callee as Rule.Node)
  if (api && runtimeSources.has(api.source) && api.name === "resetSfccRuntime") {
    return true
  }
  return (
    node.callee.type === "MemberExpression" &&
    ["mock", "mockResolved", "setGlobals", "unsetGlobals", "reset"].includes(
      getStaticMemberName(node.callee as Rule.Node) ?? "",
    ) &&
    isRuntime(context, node.callee.object as Rule.Node)
  )
}

export function isVitestTestApi(
  context: Rule.RuleContext,
  node: Rule.Node,
  names = ["it", "test", "describe"],
): boolean {
  if (isVitestApi(context, node, names)) {
    return true
  }
  if (node.type === "MemberExpression") {
    return isVitestTestApi(context, node.object as Rule.Node, names)
  }
  if (node.type === "CallExpression") {
    return isVitestTestApi(context, node.callee as Rule.Node, names)
  }
  if (node.type === "TaggedTemplateExpression") {
    return isVitestTestApi(context, node.tag as Rule.Node, names)
  }
  return false
}

export function isValueImport(node: Rule.Node): boolean {
  if (node.type !== "ImportDeclaration") {
    return false
  }
  const declaration = node as Rule.Node & { importKind?: string }
  return (
    declaration.importKind !== "type" &&
    (node.specifiers.length === 0 ||
      node.specifiers.some(
        (specifier) =>
          (specifier as typeof specifier & { importKind?: string }).importKind !== "type",
      ))
  )
}

export function createSfccModuleCheck(context: Rule.RuleContext) {
  let resolve: ((specifier: string) => boolean) | undefined
  return (specifier: string): boolean => {
    if (specifier.startsWith("dw/") || specifier === "server") {
      return true
    }
    if (!resolve) {
      const { roots, filename } = getTestModuleResolution(context)
      const resolveModule = createModuleResolver(roots)
      resolve = (source) => {
        const resolved =
          resolveModule(source, filename) ??
          (source.startsWith(".") || path.isAbsolute(source)
            ? resolveCandidateFile(path.resolve(path.dirname(filename), source), source)
            : undefined)
        return (
          resolved !== undefined &&
          resolved.endsWith(".js") &&
          findContainingCartridgeRoot(resolved, roots) !== undefined
        )
      }
    }
    return resolve(specifier)
  }
}
