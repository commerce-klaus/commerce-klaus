import {
  type HookRegistration,
  getHookRegistrationsFromDocument,
  getRequiredHookExportName,
  resolveHookScriptPath,
} from "@commerce-klaus/sfcc-module-resolver"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const DIAGNOSTIC_CODE = 81001

export function validateHookRegistrations(cartridgeRoots: string[]): ts.Diagnostic[] {
  return cartridgeRoots.flatMap((cartridgeRoot) => validateCartridgeHooks(cartridgeRoot))
}

function validateCartridgeHooks(cartridgeRoot: string): ts.Diagnostic[] {
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
  const hooksFile = readJsonSourceFile(hooksPath)
  if (!hooksFile) {
    return [createDiagnostic(packagePath, `Could not find hooks file at ${packageJson.hooks}.`)]
  }

  const parsedHooks = parseHooksDocument(hooksFile)
  if ("diagnostic" in parsedHooks) {
    return [parsedHooks.diagnostic]
  }

  const registrationNodes = getHookRegistrationNodes(hooksFile)

  return parsedHooks.hooks.flatMap((registration, index) =>
    validateHookRegistration(registration, hooksFile, registrationNodes[index]),
  )
}

function parseHooksDocument(
  hooksFile: ts.JsonSourceFile,
): { hooks: HookRegistration[] } | { diagnostic: ts.Diagnostic } {
  let document: unknown
  try {
    document = JSON.parse(hooksFile.text)
  } catch {
    return { diagnostic: createDiagnostic(hooksFile.fileName, "Could not parse hooks.json.") }
  }

  const hooks = getHookRegistrationsFromDocument(document)
  if (!hooks) {
    return {
      diagnostic: createDiagnostic(hooksFile.fileName, 'hooks.json must contain a "hooks" array.'),
    }
  }

  return { hooks }
}

function validateHookRegistration(
  registration: HookRegistration,
  hooksFile: ts.SourceFile,
  registrationNode: ts.Node | undefined,
): ts.Diagnostic[] {
  const diagnostics: ts.Diagnostic[] = []
  const methodName = getRequiredHookExportName(registration.name)
  const scriptPath = resolveHookScriptPath(path.dirname(hooksFile.fileName), registration.script)

  if (!scriptPath) {
    diagnostics.push(
      createNodeDiagnostic(
        hooksFile,
        registrationNode,
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

function readSourceFile(filePath: string): ts.SourceFile | undefined {
  const content = ts.sys.readFile(filePath)
  return content === undefined
    ? undefined
    : ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest)
}

function readJsonSourceFile(filePath: string): ts.JsonSourceFile | undefined {
  const content = ts.sys.readFile(filePath)
  return content === undefined ? undefined : ts.parseJsonText(filePath, content)
}

// Locates the AST node for each "hooks" array element so diagnostics can point at the specific entry.
function getHookRegistrationNodes(hooksFile: ts.JsonSourceFile): ts.Expression[] {
  const root = hooksFile.statements[0]?.expression
  if (!root || !ts.isObjectLiteralExpression(root)) {
    return []
  }

  const hooksProperty = root.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && getPropertyNameText(property.name) === "hooks",
  )

  return hooksProperty && ts.isArrayLiteralExpression(hooksProperty.initializer)
    ? [...hooksProperty.initializer.elements]
    : []
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

function createNodeDiagnostic(
  hooksFile: ts.SourceFile,
  node: ts.Node | undefined,
  messageText: string,
): ts.Diagnostic {
  if (!node) {
    return createDiagnostic(hooksFile.fileName, messageText)
  }

  return {
    category: ts.DiagnosticCategory.Error,
    code: DIAGNOSTIC_CODE,
    file: hooksFile,
    messageText,
    start: node.getStart(hooksFile),
    length: node.getWidth(hooksFile),
  }
}
