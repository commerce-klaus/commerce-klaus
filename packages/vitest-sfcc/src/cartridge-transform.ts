import { resolveSuperModuleFilePath } from "@commerce-klaus/sfcc-module-resolver"
import { parse, type Node } from "acorn"
import { ancestor } from "acorn-walk"
import path from "node:path"

export const CARTRIDGE_MODULE_SUFFIX = "?vitest-sfcc-cjs"

export function isCartridgeModule(filePath: string, cartridgeRoots: string[]): boolean {
  const normalizedPath = path.resolve(filePath)
  return cartridgeRoots.some((root) => {
    const relativePath = path.relative(root, normalizedPath)
    return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)
  })
}

export function markCartridgeImports(
  code: string,
  importer: string,
  cartridgeRoots: string[],
): string {
  return code.replace(
    /(from\s*|import\s*\(\s*)(["'])([^"']+\.js)\2/g,
    (match, prefix: string, quote: string, specifier: string) => {
      if (!specifier.startsWith(".")) {
        return match
      }

      const candidatePath = path.resolve(path.dirname(importer), specifier)
      return isCartridgeModule(candidatePath, cartridgeRoots)
        ? `${prefix}${quote}${specifier}${CARTRIDGE_MODULE_SUFFIX}${quote}`
        : match
    },
  )
}

export function transformCartridgeCommonJs(
  code: string,
  id: string,
  cartridgeRoots: string[],
): string {
  let transformed = code
  let requireIndex = 0
  const requireImports: string[] = []
  const requiredBindings = new Map<string, string>()
  const constantModuleIds = new Map<string, string>()
  const lazyRequireRanges: Array<{ end: number; moduleId: string; start: number }> = []

  for (const match of transformed.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])([^"']+)\2\s*;?/g,
  )) {
    constantModuleIds.set(match[1], match[3])
  }

  const importRequiredModule = (moduleId: string): string => {
    const existingBinding = requiredBindings.get(moduleId)
    if (existingBinding) {
      return existingBinding
    }

    const importedBinding = `__sfcc_required_${requireIndex++}`
    requireImports.push(`import ${importedBinding} from ${JSON.stringify(moduleId)}`)
    requiredBindings.set(moduleId, importedBinding)
    return importedBinding
  }

  ancestor(parse(transformed, { ecmaVersion: "latest", sourceType: "script" }), {
    CallExpression(node, ancestors: Node[]) {
      if (
        node.callee.type !== "Identifier" ||
        node.callee.name !== "require" ||
        node.arguments.length !== 1
      ) {
        return
      }

      const argument = node.arguments[0]
      const moduleId =
        argument.type === "Literal" && typeof argument.value === "string"
          ? argument.value
          : argument.type === "Identifier"
            ? constantModuleIds.get(argument.name)
            : undefined
      if (!moduleId) {
        return
      }

      const insideFunction = ancestors.some(
        (ancestorNode: Node) =>
          ancestorNode.type === "FunctionDeclaration" ||
          ancestorNode.type === "FunctionExpression" ||
          ancestorNode.type === "ArrowFunctionExpression",
      )
      if (insideFunction) {
        lazyRequireRanges.push({ end: node.end, moduleId, start: node.start })
      }
    },
  })

  for (const { end, moduleId, start } of lazyRequireRanges.toSorted(
    (left, right) => right.start - left.start,
  )) {
    transformed = `${transformed.slice(0, start)}__sfcc_require(${JSON.stringify(moduleId)})${transformed.slice(end)}`
  }

  if (transformed.includes("module.superModule")) {
    const superModulePath = resolveSuperModuleFilePath(id, cartridgeRoots)
    if (superModulePath) {
      transformed =
        `import __sfcc_superModule__ from ${JSON.stringify(superModulePath)}\n` +
        transformed.replace(/\bmodule\.superModule\b/g, "__sfcc_superModule__")
    } else {
      transformed = transformed.replace(/\bmodule\.superModule\b/g, "undefined")
    }
  }

  transformed = transformed.replace(
    /\brequire\(\s*(["'])([^"']+)\1\s*\)/g,
    (_match, _quote: string, moduleId: string) => importRequiredModule(moduleId),
  )
  transformed = transformed.replace(
    /\brequire\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
    (match, constantName: string) => {
      const moduleId = constantModuleIds.get(constantName)
      return moduleId ? importRequiredModule(moduleId) : match
    },
  )
  const runtimeImport = lazyRequireRanges.length
    ? 'import { requireSfccModule as __sfcc_require } from "@commerce-klaus/sfcc-test-runtime"\n'
    : ""
  transformed = `${runtimeImport}${requireImports.join("\n")}\n${transformed}`

  transformed = transformed.replace(
    /^\s*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$/gm,
    (_match, exportName: string, binding: string) => `export { ${binding} as ${exportName} }`,
  )
  transformed = transformed.replace(
    /^\s*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/gm,
    (_match, exportName: string) => `export const ${exportName} =`,
  )
  transformed = transformed.replace(/\bmodule\.exports\s*=/g, "export default")

  if (/\brequire\s*\(/.test(transformed)) {
    throw new Error(
      `vitest-sfcc cannot transform a dynamic require() in ${id}. Use a string literal module ID.`,
    )
  }
  if (/\b(?:module\.)?exports\s*\./.test(transformed)) {
    throw new Error(
      `vitest-sfcc cannot transform this named CommonJS export in ${id}. Use a top-level export assignment.`,
    )
  }

  return transformed
}
