import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const DIAGNOSTIC_CODE = 81001

interface HookRegistration {
  name: string
  script: string
}

interface HookDocument {
  hooks: HookRegistration[]
}

export function validateHookRegistrations(
  cartridgeRoots: string[],
  workspaceRoot: string,
): ts.Diagnostic[] {
  const knownHookNames = readKnownHookNames(workspaceRoot)

  return cartridgeRoots.flatMap((cartridgeRoot) =>
    validateCartridgeHooks(cartridgeRoot, knownHookNames),
  )
}

function validateCartridgeHooks(
  cartridgeRoot: string,
  knownHookNames: Set<string>,
): ts.Diagnostic[] {
  const packagePath = path.join(cartridgeRoot, "package.json")
  if (!fs.existsSync(packagePath)) {
    return []
  }

  const packageFile = readSourceFile(packagePath)
  if (!packageFile) {
    return [createDiagnostic(packagePath, "Could not read cartridge package.json.")]
  }

  let packageJson: { hooks?: unknown }
  try {
    packageJson = JSON.parse(packageFile.text) as { hooks?: unknown }
  } catch {
    return [createDiagnostic(packagePath, "Could not parse cartridge package.json.")]
  }

  if (packageJson.hooks === undefined) {
    return []
  }

  if (typeof packageJson.hooks !== "string" || packageJson.hooks.length === 0) {
    return [createDiagnostic(packagePath, 'The "hooks" property must be a non-empty string path.')]
  }

  const hooksPath = path.resolve(cartridgeRoot, packageJson.hooks)
  const hooksFile = readSourceFile(hooksPath)
  if (!hooksFile) {
    return [createDiagnostic(packagePath, `Could not find hooks file at ${packageJson.hooks}.`)]
  }

  const parsedHooks = parseHooksDocument(hooksFile)
  if ("diagnostic" in parsedHooks) {
    return [parsedHooks.diagnostic]
  }

  return parsedHooks.hooks.flatMap((registration) =>
    validateHookRegistration(registration, hooksFile, knownHookNames),
  )
}

function parseHooksDocument(
  hooksFile: ts.SourceFile,
): { hooks: HookRegistration[] } | { diagnostic: ts.Diagnostic } {
  let document: unknown
  try {
    document = JSON.parse(hooksFile.text)
  } catch {
    return { diagnostic: createDiagnostic(hooksFile.fileName, "Could not parse hooks.json.") }
  }

  if (!isHookDocument(document)) {
    return {
      diagnostic: createDiagnostic(hooksFile.fileName, 'hooks.json must contain a "hooks" array.'),
    }
  }

  return { hooks: document.hooks }
}

function isHookDocument(value: unknown): value is HookDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "hooks" in value &&
    Array.isArray(value.hooks) &&
    value.hooks.every(
      (entry): entry is HookRegistration =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        typeof entry.name === "string" &&
        entry.name.length > 0 &&
        "script" in entry &&
        typeof entry.script === "string" &&
        entry.script.length > 0,
    )
  )
}

function validateHookRegistration(
  registration: HookRegistration,
  hooksFile: ts.SourceFile,
  knownHookNames: Set<string>,
): ts.Diagnostic[] {
  const diagnostics: ts.Diagnostic[] = []
  const methodName = registration.name.startsWith("dw.")
    ? registration.name.split(".").at(-1)
    : undefined
  const scriptPath = resolveHookScriptPath(path.dirname(hooksFile.fileName), registration.script)

  if (isUnknownKnownHook(registration.name, knownHookNames)) {
    diagnostics.push(
      createDiagnostic(hooksFile.fileName, `Unknown Salesforce hook "${registration.name}".`),
    )
  }

  if (!scriptPath) {
    diagnostics.push(
      createDiagnostic(
        hooksFile.fileName,
        `Could not resolve script "${registration.script}" for hook "${registration.name}".`,
      ),
    )
    return diagnostics
  }

  const scriptFile = readSourceFile(scriptPath)
  if (methodName && scriptFile && !hasStaticCommonJsExport(scriptFile, methodName)) {
    diagnostics.push(
      createDiagnostic(
        scriptPath,
        `Hook "${registration.name}" requires a static CommonJS export named "${methodName}".`,
      ),
    )
  }

  return diagnostics
}

function resolveHookScriptPath(hooksDirectory: string, script: string): string | undefined {
  const requestedPath = path.resolve(hooksDirectory, script)
  const candidates = [
    requestedPath,
    ...[".js", ".cjs", ".mjs", ".ds"].map((ext) => `${requestedPath}${ext}`),
  ]
  return candidates.find((candidate) => fs.statSync(candidate, { throwIfNoEntry: false })?.isFile())
}

function hasStaticCommonJsExport(scriptFile: ts.SourceFile, methodName: string): boolean {
  return scriptFile.statements.some((statement) => {
    if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression)) {
      return false
    }

    const { left, operatorToken, right } = statement.expression
    if (operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      return false
    }

    if (isCommonJsExportProperty(left, methodName)) {
      return true
    }

    return isModuleExports(left) && isObjectLiteralExport(right, methodName)
  })
}

function isCommonJsExportProperty(left: ts.Expression, methodName: string): boolean {
  if (!ts.isPropertyAccessExpression(left) || left.name.text !== methodName) {
    return false
  }

  return (
    (ts.isIdentifier(left.expression) && left.expression.text === "exports") ||
    isModuleExports(left.expression)
  )
}

function isModuleExports(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "module" &&
    expression.name.text === "exports"
  )
}

function isObjectLiteralExport(expression: ts.Expression, methodName: string): boolean {
  return (
    ts.isObjectLiteralExpression(expression) &&
    expression.properties.some(
      (property) =>
        (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
        getPropertyNameText(property.name) === methodName,
    )
  )
}

function getPropertyNameText(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
}

function readKnownHookNames(workspaceRoot: string): Set<string> {
  const hooksDirectory = path.join(workspaceRoot, ".b2c-script-types", "types", "dw")
  if (!fs.existsSync(hooksDirectory)) {
    return new Set()
  }

  const hookNames = new Set<string>()
  for (const declarationPath of findHookDeclarations(hooksDirectory)) {
    const declaration = readSourceFile(declarationPath)
    if (!declaration) {
      continue
    }

    collectHookNames(declaration, hookNames)
  }

  return hookNames
}

function collectHookNames(node: ts.Node, hookNames: Set<string>): void {
  if (ts.isPropertySignature(node) && node.type && ts.isLiteralTypeNode(node.type)) {
    const literal = node.type.literal
    if (ts.isStringLiteral(literal) && literal.text.startsWith("dw.")) {
      hookNames.add(literal.text)
    }
  }

  ts.forEachChild(node, (child) => collectHookNames(child, hookNames))
}

function findHookDeclarations(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return findHookDeclarations(entryPath)
    }

    return entry.name.endsWith("Hooks.d.ts") ? [entryPath] : []
  })
}

function isUnknownKnownHook(hookName: string, knownHookNames: Set<string>): boolean {
  if (knownHookNames.has(hookName) || hookName.startsWith("dw.ocapi.")) {
    return false
  }

  return [...knownHookNames].some((knownHookName) => {
    const namespace = knownHookName.split(".").slice(0, 2).join(".")
    return hookName.startsWith(`${namespace}.`)
  })
}

function readSourceFile(filePath: string): ts.SourceFile | undefined {
  const content = ts.sys.readFile(filePath)
  return content === undefined
    ? undefined
    : ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest)
}

function createDiagnostic(filePath: string, messageText: string): ts.Diagnostic {
  return {
    category: ts.DiagnosticCategory.Error,
    code: DIAGNOSTIC_CODE,
    file: readSourceFile(filePath),
    messageText,
    start: 0,
    length: 0,
  }
}
