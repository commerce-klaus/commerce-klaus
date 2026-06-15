const {
  createSfccModuleResolver,
  findCartridgesDir,
  inferCartridgeOrder,
  transformSuperModuleSource,
} = require("./shared") as typeof import("./shared.ts")

function init(modules: { typescript: typeof import("typescript") }) {
  const ts = modules.typescript

  function create(info: {
    project: {
      getCurrentDirectory(): string
      getCompilationSettings(): import("typescript").CompilerOptions
    }
    languageServiceHost: {
      getScriptSnapshot?(fileName: string): import("typescript").IScriptSnapshot | undefined
      resolveModuleNames?(
        moduleNames: string[],
        containingFile: string,
        reusedNames?: string[],
        redirectedReference?: import("typescript").ResolvedProjectReference,
      ): Array<import("typescript").ResolvedModule | undefined>
      resolveModuleNameLiterals?(
        moduleLiterals: ReadonlyArray<import("typescript").StringLiteralLike>,
        containingFile: string,
        redirectedReference: import("typescript").ResolvedProjectReference | undefined,
        options: import("typescript").CompilerOptions,
        containingSourceFile: import("typescript").SourceFile | undefined,
        reusedNames: string[] | undefined,
      ): import("typescript").ResolvedModuleWithFailedLookupLocations[]
    }
    languageService: unknown
  }) {
    const projectDir = info.project.getCurrentDirectory()
    const cartridgesDir = findCartridgesDir(projectDir)
    const cartridgeRoots = cartridgesDir ? inferCartridgeOrder(cartridgesDir) : []
    const resolveSfccModule = createSfccModuleResolver(cartridgeRoots)

    const host = info.languageServiceHost
    const compilerOptions = info.project.getCompilationSettings()

    const originalGetScriptSnapshot = host.getScriptSnapshot?.bind(host)
    const originalResolveModuleNames = host.resolveModuleNames?.bind(host)
    const originalResolveModuleNameLiterals = host.resolveModuleNameLiterals?.bind(host)

    host.getScriptSnapshot = (fileName) => {
      const snapshot = originalGetScriptSnapshot?.(fileName)
      if (!snapshot || !fileName.endsWith(".js") || cartridgeRoots.length === 0) {
        return snapshot
      }

      const sourceCode = snapshot.getText(0, snapshot.getLength())
      const transformedSource = transformSuperModuleSource(sourceCode, fileName, cartridgeRoots)
      if (transformedSource === sourceCode) {
        return snapshot
      }

      return ts.ScriptSnapshot.fromString(transformedSource)
    }

    host.resolveModuleNames = (moduleNames, containingFile, reusedNames, redirectedReference) => {
      const defaultResolved = originalResolveModuleNames
        ? originalResolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference)
        : moduleNames.map(
            (moduleName) =>
              ts.resolveModuleName(moduleName, containingFile, compilerOptions, ts.sys)
                .resolvedModule,
          )

      return moduleNames.map((moduleName, index) => {
        const sfccResolved = resolveSfccModule(moduleName, containingFile)
        if (sfccResolved) {
          return toResolvedModule(sfccResolved)
        }

        return defaultResolved[index]
      })
    }

    host.resolveModuleNameLiterals = (
      moduleLiterals,
      containingFile,
      redirectedReference,
      options,
      containingSourceFile,
      reusedNames,
    ) => {
      const defaultResolved = originalResolveModuleNameLiterals
        ? originalResolveModuleNameLiterals(
            moduleLiterals,
            containingFile,
            redirectedReference,
            options,
            containingSourceFile,
            reusedNames,
          )
        : moduleLiterals.map((literal) => ({
            resolvedModule: ts.resolveModuleName(
              literal.text,
              containingFile,
              compilerOptions,
              ts.sys,
            ).resolvedModule,
          }))

      return moduleLiterals.map((literal, index) => {
        const sfccResolved = resolveSfccModule(literal.text, containingFile)
        if (sfccResolved) {
          return { resolvedModule: toResolvedModule(sfccResolved) }
        }

        return defaultResolved[index]
      })
    }

    return info.languageService
  }

  function toResolvedModule(filePath: string): import("typescript").ResolvedModuleFull {
    let extension = ts.Extension.Js
    if (filePath.endsWith(".d.ts")) {
      extension = ts.Extension.Dts
    } else if (filePath.endsWith(".ts")) {
      extension = ts.Extension.Ts
    } else if (filePath.endsWith(".tsx")) {
      extension = ts.Extension.Tsx
    } else if (filePath.endsWith(".jsx")) {
      extension = ts.Extension.Jsx
    }

    return {
      resolvedFileName: filePath,
      extension,
      isExternalLibraryImport: false,
    }
  }

  return { create }
}

export = init
