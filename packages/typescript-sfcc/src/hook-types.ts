import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

export const GENERATED_HOOK_TYPES_FILE_NAME = "sfcc-hooks.generated.d.ts"

export interface GenerateHookTypesResult {
  outputFilePath: string
  declarationsCount: number
  sourceFiles: string[]
  written: boolean
}

export interface GenerateHookTypesOptions {
  workspaceRoot: string
  existsSync?: (filePath: string) => boolean
  mkdirSync?: (dirPath: string, options: { recursive: boolean }) => void
  readdirSync?: (directory: string, options: { withFileTypes: true }) => fs.Dirent[]
  readFileSync?: (filePath: string, encoding: BufferEncoding) => string
  writeFileSync?: (filePath: string, content: string, encoding: BufferEncoding) => void
}

export function generateHookTypes({
  workspaceRoot,
  existsSync = fs.existsSync,
  mkdirSync = fs.mkdirSync,
  readdirSync = fs.readdirSync,
  readFileSync = fs.readFileSync,
  writeFileSync = fs.writeFileSync,
}: GenerateHookTypesOptions): GenerateHookTypesResult {
  const typesDirectory = path.join(workspaceRoot, ".b2c-script-types", "types")
  const outputFilePath = path.join(typesDirectory, GENERATED_HOOK_TYPES_FILE_NAME)
  const hooksDirectory = path.join(typesDirectory, "dw")
  const sourceFiles = existsSync(hooksDirectory)
    ? findHookDeclarations(hooksDirectory, readdirSync)
    : []
  const declarations = sourceFiles.flatMap((sourceFilePath) =>
    readHookDeclarations(sourceFilePath, hooksDirectory, readFileSync),
  )

  mkdirSync(typesDirectory, { recursive: true })
  writeFileSync(outputFilePath, renderHookTypes(declarations), "utf8")

  return {
    outputFilePath,
    declarationsCount: declarations.length,
    sourceFiles,
    written: true,
  }
}

interface HookDeclaration {
  alias: string
  interfaceName: string
  methodName: string
  moduleSpecifier: string
}

function readHookDeclarations(
  sourceFilePath: string,
  hooksDirectory: string,
  readFileSync: (filePath: string, encoding: BufferEncoding) => string,
): HookDeclaration[] {
  const sourceText = readFileSync(sourceFilePath, "utf8")
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest)
  const interfaceDeclaration = sourceFile.statements.find(ts.isInterfaceDeclaration)
  if (!interfaceDeclaration) {
    return []
  }

  const methods = new Set(
    interfaceDeclaration.members
      .filter(ts.isMethodSignature)
      .map((member) => getPropertyNameText(member.name))
      .filter((name): name is string => name !== undefined),
  )
  const moduleSpecifier = toModuleSpecifier(sourceFilePath, hooksDirectory)

  return interfaceDeclaration.members.flatMap((member) => {
    if (!ts.isPropertySignature(member) || !member.type || !ts.isLiteralTypeNode(member.type)) {
      return []
    }

    const literal = member.type.literal
    if (!ts.isStringLiteral(literal) || !literal.text.startsWith("dw.")) {
      return []
    }

    const methodName = literal.text.split(".").at(-1)
    if (!methodName || !methods.has(methodName)) {
      return []
    }

    return [
      {
        alias: toAliasName(literal.text),
        interfaceName: interfaceDeclaration.name.text,
        methodName,
        moduleSpecifier,
      },
    ]
  })
}

function findHookDeclarations(
  directory: string,
  readdirSync: (directory: string, options: { withFileTypes: true }) => fs.Dirent[],
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return findHookDeclarations(entryPath, readdirSync)
    }

    return entry.name.endsWith("Hooks.d.ts") ? [entryPath] : []
  })
}

function getPropertyNameText(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
}

function toModuleSpecifier(sourceFilePath: string, hooksDirectory: string): string {
  return `dw/${path
    .relative(hooksDirectory, sourceFilePath)
    .replaceAll(path.sep, "/")
    .replace(/\.d\.ts$/u, "")}`
}

function toAliasName(extensionPoint: string): string {
  return extensionPoint
    .split(".")
    .slice(1)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join("")
}

function renderHookTypes(declarations: HookDeclaration[]): string {
  const uniqueDeclarations = [
    ...new Map(declarations.map((entry) => [entry.alias, entry])).values(),
  ]
  const imports = uniqueDeclarations.map(
    (entry, index) => `import HookInterface${index} = require("${entry.moduleSpecifier}")`,
  )
  const aliases = uniqueDeclarations.map(
    (entry, index) => `    type ${entry.alias} = HookInterface${index}["${entry.methodName}"]`,
  )

  return [
    ...imports,
    imports.length > 0 ? "" : undefined,
    "declare global {",
    "  namespace SfccHooks {",
    ...aliases,
    "  }",
    "}",
    "",
    "export {}",
    "",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n")
}
