import { callExpression, identifier, stringLiteral } from "@babel/types"
import {
  createSfccModuleResolver,
  inferCartridgeOrder,
  resolveSuperModuleFilePath,
  stripExt,
  toPosixPath,
} from "@commerce-klaus/sfcc-module-resolver"
import importsVisitor from "imports-visitor"
import fs from "node:fs"
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

const resolveBasePath = (basePath: string, filename: string, cwd: string) => {
  if (path.isAbsolute(basePath)) {
    return basePath
  }

  const fromCwd = path.resolve(cwd, basePath)
  if (fs.existsSync(fromCwd)) {
    return fromCwd
  }

  // Fallback: resolve relative paths from the transformed file and its parents.
  // This keeps test fixtures stable even when tests are executed from repo root.
  let currentDir = path.dirname(filename)
  while (true) {
    const candidate = path.resolve(currentDir, basePath)
    if (fs.existsSync(candidate)) {
      return candidate
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return fromCwd
}

const getRelativeRequirePath = (moduleName: string, resolvedFile: string) => {
  const relativePath = toPosixPath(path.relative(path.dirname(moduleName), stripExt(resolvedFile)))
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`
}

const resolveCartridgeRoots = (options: PluginOptions, filename: string): string[] => {
  const cwd = options.cwd ?? process.cwd()
  const resolvedBasePath = resolveBasePath(options.basePath, filename, cwd)

  if (options.cartridgePath && options.cartridgePath.length > 0) {
    return options.cartridgePath.map((cartridge) => path.join(resolvedBasePath, cartridge))
  }

  return inferCartridgeOrder({
    cartridgesDir: resolvedBasePath,
    cwd,
    siteTemplatePath: options.siteTemplatePath,
    site: options.site,
    solutionConfigPath: options.solutionConfigPath,
    envCartridgePath: options.envCartridgePath,
  })
}

const plugin = (_babel: unknown, options: PluginOptions) => ({
  visitor: {
    Program(thePath: any, state: any) {
      const cartridgeRoots = resolveCartridgeRoots(options, state.file.opts.filename)
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
        const cartridgeRoots = resolveCartridgeRoots(options, state.file.opts.filename)
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
