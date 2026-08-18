import { callExpression, identifier, stringLiteral } from "@babel/types"
import {
  createSfccModuleResolver,
  resolveCartridgeRoots,
  resolveSuperModuleFilePath,
  stripExt,
  toPosixPath,
} from "@commerce-klaus/sfcc-module-resolver"
import importsVisitor from "imports-visitor"
import path from "node:path"

type ImportLike = {
  source: string
}

type PluginOptions = {
  cartridgePath?: string[]
  basePath: string
  cwd?: string
  siteTemplatePath?: string
  site?: string
  solutionConfigPath?: string
  envCartridgePath?: string
}

const getRelativeRequirePath = (moduleName: string, resolvedFile: string) => {
  const relativePath = toPosixPath(path.relative(path.dirname(moduleName), stripExt(resolvedFile)))
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
    containingFile: filename,
  })
}

const plugin = (_babel: unknown, options: PluginOptions) => ({
  visitor: {
    Program(thePath: any, state: any) {
      const cartridgeRoots = getCartridgeRoots(options, state.file.opts.filename)
      const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)
      const imports: ImportLike[] = []
      thePath.traverse(importsVisitor, { imports })
      for (const imp of imports) {
        // Handle
        //
        // require("*/cartridge/scripts/foo")
        //
        // Find the first cartridge that matches the requested module name
        //
        if (imp.source.indexOf("*/") === 0) {
          const resolved = resolveSfccModule(imp.source, state.file.opts.filename)
          if (resolved) {
            imp.source = getRelativeRequirePath(state.file.opts.filename, resolved)
          }
        }

        // Handle
        //
        // require("~/cartridge/scripts/foo")
        //
        // Own cartridge - rewrites the module path to a relative URL.
        //
        if (imp.source.indexOf("~/") === 0) {
          const resolved = resolveSfccModule(imp.source, state.file.opts.filename)
          if (resolved) {
            imp.source = getRelativeRequirePath(state.file.opts.filename, resolved)
          }
        }
      }
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
