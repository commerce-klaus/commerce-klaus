import { callExpression, identifier, stringLiteral } from "@babel/types"
import importsVisitor from "imports-visitor"
import fs from "node:fs"
import path from "node:path"

const SUPPORTED_EXTENSIONS = ["js", "ds", "json"]

type ImportLike = {
  source: string
}

type PluginOptions = {
  cartridgePath: string[]
  basePath: string
}

const resolveBasePath = (basePath: string, filename: string) => {
  if (path.isAbsolute(basePath)) {
    return basePath
  }

  const fromCwd = path.resolve(basePath)
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

const getModulePath = (moduleName: string, basePath: string, cartridge: string, target: string) => {
  const relativePath = path.relative(path.dirname(moduleName), `${basePath}/${cartridge}${target}`)
  return (relativePath.includes(".") ? "" : "./") + relativePath
}

const plugin = (_babel: unknown, { cartridgePath, basePath }: PluginOptions) => ({
  visitor: {
    Program(thePath: any, state: any) {
      const resolvedBasePath = resolveBasePath(basePath, state.file.opts.filename)
      const imports: ImportLike[] = []
      thePath.traverse(importsVisitor, { imports })
      for (const imp of imports) {
        /**
         * Finds and sets the rewrittten module path.
         *
         * @param findCartridge  a function to find the cartridge
         */
        const resolve = (findCartridge: (target: string) => string | undefined) => {
          const target = imp.source.slice(1)
          const foundCartridge = findCartridge(target)
          if (foundCartridge) {
            imp.source = getModulePath(
              state.file.opts.filename,
              resolvedBasePath,
              foundCartridge,
              target,
            )
          }
        }

        // Handle
        //
        // require("*/cartridge/scripts/foo")
        //
        // Find the first cartridge that matches the requested module name
        //
        if (imp.source.indexOf("*/") === 0) {
          resolve((target) =>
            cartridgePath.find((cartridge) =>
              SUPPORTED_EXTENSIONS.find((extension) =>
                fs.existsSync(`${resolvedBasePath}/${cartridge}${target}.${extension}`),
              ),
            ),
          )
        }

        // Handle
        //
        // require("~/cartridge/scripts/foo")
        //
        // Own cartridge - rewrites the module path to a relative URL.
        //
        if (imp.source.indexOf("~/") === 0) {
          resolve(
            () =>
              path
                .relative(resolvedBasePath, path.dirname(state.file.opts.filename))
                .split(path.sep)[0],
          )
        }
      }
    },

    MemberExpression(thePath: any, state: any) {
      const resolvedBasePath = resolveBasePath(basePath, state.file.opts.filename)
      // Find "module.superModule"
      if (
        thePath.node.object.type === "Identifier" &&
        thePath.node.object.name === "module" &&
        thePath.node.property.name === "superModule"
      ) {
        // path to module relative to the cartridge base path
        const pathToModule = path.relative(resolvedBasePath, state.file.opts.filename)

        // Path without cartridge name
        const shortenedPathParts = pathToModule.split(path.sep).slice(1)

        // Remove extension
        const lastPart = shortenedPathParts.at(-1)
        if (!lastPart) {
          return
        }
        shortenedPathParts[shortenedPathParts.length - 1] = lastPart.replace(/\.[^.]+$/, "")
        const shortenedPathToModule = `/${shortenedPathParts.join(path.sep)}`

        const cartridge = pathToModule.split(path.sep)[0] // the own cartridge name
        // all cartridges after the found cartridges in cartridge path
        const newCartridgePath = cartridgePath.slice(cartridgePath.indexOf(cartridge) + 1)

        // Find the the cartridge which contains the next match for the module path
        const foundCartridge = newCartridgePath.find((theCartridge) =>
          SUPPORTED_EXTENSIONS.find((extension) =>
            fs.existsSync(
              `${resolvedBasePath}/${theCartridge}${shortenedPathToModule}.${extension}`,
            ),
          ),
        )

        let foundRequire: string | undefined
        if (foundCartridge) {
          foundRequire = getModulePath(
            state.file.opts.filename,
            resolvedBasePath,
            foundCartridge,
            shortenedPathToModule,
          )
        }

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
