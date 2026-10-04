import { callExpression, identifier, stringLiteral } from "@babel/types"
import {
  createModuleResolver,
  resolveCartridgeRoots,
  resolveSuperModuleFilePath,
  stripExtension,
  toPosixPath,
  type ModuleResolutionOptions,
} from "@commerce-klaus/sfcc-module-resolver/resolution"
import path from "node:path"

export type PluginOptions = ModuleResolutionOptions

const getRelativeRequirePath = (moduleName: string, resolvedFile: string) => {
  const relativePath = toPosixPath(
    path.relative(path.dirname(moduleName), stripExtension(resolvedFile)),
  )
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`
}

const getCartridgeRoots = (options: PluginOptions, filename: string): string[] => {
  return resolveCartridgeRoots({
    basePath: options.basePath,
    cwd: options.cwd,
    cartridgePath: options.cartridgePath,
    siteTemplatePath: options.siteTemplatePath,
    site: options.site,
    solutionConfigPath: options.solutionConfigPath,
    envCartridgePath: options.envCartridgePath,
    configFile: options.configFile,
    containingFile: filename,
  })
}

const getResolvedSource = (
  source: string,
  resolveSfccModule: ReturnType<typeof createModuleResolver>,
  filename: string,
): string | undefined => {
  if (!source.startsWith("*/") && !source.startsWith("~/")) return

  const resolved = resolveSfccModule(source, filename)
  return resolved ? getRelativeRequirePath(filename, resolved) : undefined
}

const plugin = (_babel: unknown, options: PluginOptions) => ({
  visitor: {
    Program(thePath: any, state: any) {
      const cartridgeRoots = getCartridgeRoots(options, state.file.opts.filename)
      const resolveSfccModule = createModuleResolver(cartridgeRoots)
      const filename = state.file.opts.filename
      const rewriteSource = (source: any) => {
        if (source?.type !== "StringLiteral") return source

        const resolvedSource = getResolvedSource(source.value, resolveSfccModule, filename)
        return resolvedSource ? stringLiteral(resolvedSource) : source
      }

      thePath.traverse({
        enter(path: any) {
          const node = path.node

          if (
            node.type === "ImportDeclaration" ||
            node.type === "ExportNamedDeclaration" ||
            node.type === "ExportAllDeclaration"
          ) {
            node.source = rewriteSource(node.source)
          } else if (node.type === "ImportExpression") {
            node.source = rewriteSource(node.source)
          } else if (
            node.type === "CallExpression" &&
            ((node.callee.type === "Identifier" && node.callee.name === "require") ||
              node.callee.type === "Import")
          ) {
            node.arguments[0] = rewriteSource(node.arguments[0])
          }
        },
      })
    },

    MemberExpression(thePath: any, state: any) {
      // Find "module.superModule"
      if (
        thePath.node.object.type === "Identifier" &&
        thePath.node.object.name === "module" &&
        thePath.node.property.name === "superModule"
      ) {
        const cartridgeRoots = getCartridgeRoots(options, state.file.opts.filename)
        const resolved = resolveSuperModuleFilePath(state.file.opts.filename, cartridgeRoots)
        const foundRequire = resolved
          ? getRelativeRequirePath(state.file.opts.filename, resolved)
          : undefined

        // Replace "module.superModule" with a require() or undefined
        thePath.replaceWith(
          foundRequire
            ? callExpression(identifier("require"), [stringLiteral(foundRequire)])
            : identifier("undefined"),
        )
      }
    },
  },
})

export default plugin
