import type { Rule, Scope } from "eslint"

import { getStaticMemberName } from "../_utils/ast.js"
import { normalizeFilePath } from "../_utils/file-path.js"

type RequireEntry = {
  variable: Scope.Variable
  usedGlobally: boolean
}

type FunctionEntry = {
  dependencies: Set<string>
  name: string
  node: Rule.Node
}

type RuleOptions = {
  allowShared?: boolean
}

function getParserGlobalReturn(context: Rule.RuleContext): boolean {
  const parserOptions = (
    context as unknown as {
      parserOptions?: { ecmaFeatures?: { globalReturn?: boolean } }
    }
  ).parserOptions

  return Boolean(parserOptions?.ecmaFeatures?.globalReturn)
}

function getGlobalScope(context: Rule.RuleContext, node: Rule.Node): Scope.Scope {
  const scope = context.sourceCode.getScope(node)
  const hasGlobalReturn = getParserGlobalReturn(context)
  const sourceType = (node as { sourceType?: string }).sourceType

  if (hasGlobalReturn || sourceType === "module" || sourceType === "commonjs") {
    return scope.childScopes[0] ?? scope
  }

  return scope
}

function isReadOnlyVariable(variable: Scope.Variable): boolean {
  return (variable as Scope.Variable & { writeable?: unknown }).writeable === undefined
}

function getRequireCalleeName(variable: Scope.Variable): string | undefined {
  const definition = variable.defs[0]
  const declarationNode = definition?.node as {
    init?: { callee?: { name?: string } }
  }

  return declarationNode.init?.callee?.name
}

function getReportNode(variable: Scope.Variable): Rule.Node | undefined {
  const identifierNode = variable.identifiers[0]
  if (identifierNode) {
    return identifierNode as unknown as Rule.Node
  }

  return variable.defs[0]?.node as unknown as Rule.Node | undefined
}

function getFunctionName(node: Rule.Node): string {
  if (
    (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
    node.id?.type === "Identifier"
  ) {
    return node.id.name
  }

  const parent = (node as Rule.Node & { parent?: Rule.Node }).parent
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name
  }

  return "<anonymous>"
}

function getExportName(node: Rule.Node): string | undefined {
  if (node.type !== "MemberExpression") {
    return undefined
  }

  if (node.object.type === "Identifier" && node.object.name === "exports") {
    return getStaticMemberName(node)
  }

  if (
    node.object.type === "MemberExpression" &&
    node.object.object.type === "Identifier" &&
    node.object.object.name === "module" &&
    getStaticMemberName(node.object as Rule.Node) === "exports"
  ) {
    return getStaticMemberName(node)
  }

  return undefined
}

function getRouteTarget(node: Rule.Node): Rule.Node | undefined {
  if (
    node.type === "Identifier" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  ) {
    return node
  }

  if (node.type === "CallExpression") {
    return node.arguments.at(-1) as Rule.Node | undefined
  }

  return undefined
}

function getVariableDeclaration(variable: Scope.Variable): Rule.Node | undefined {
  const declarator = variable.defs[0]?.node as (Rule.Node & { parent?: Rule.Node }) | undefined
  const declaration = declarator?.parent

  return declaration?.type === "VariableDeclaration" && declaration.declarations.length === 1
    ? declaration
    : undefined
}

function buildMoveSuggestion(
  context: Rule.RuleContext,
  variable: Scope.Variable,
  consumer: FunctionEntry,
): Rule.SuggestionReportDescriptor | undefined {
  const declaration = getVariableDeclaration(variable)
  const body =
    consumer.node.type === "FunctionDeclaration" ||
    consumer.node.type === "FunctionExpression" ||
    consumer.node.type === "ArrowFunctionExpression"
      ? consumer.node.body
      : undefined

  if (!declaration || body?.type !== "BlockStatement") {
    return undefined
  }

  const declarationStartLine = declaration.loc?.start.line
  const adjacentComment = context.sourceCode
    .getCommentsBefore(declaration)
    .find(
      (comment) =>
        declarationStartLine !== undefined &&
        comment.loc !== null &&
        comment.loc !== undefined &&
        comment.loc.end.line >= declarationStartLine - 1,
    )
  const firstStatement = body.body[0]
  if (
    adjacentComment ||
    (firstStatement?.type === "ExpressionStatement" &&
      Boolean((firstStatement as Rule.Node & { directive?: string }).directive)) ||
    (firstStatement?.loc && firstStatement.loc.start.line === body.loc?.start.line)
  ) {
    return undefined
  }

  const declarationText = context.sourceCode.getText(declaration)
  const functionIndentation =
    context.sourceCode.lines[(consumer.node.loc?.start.line ?? 1) - 1]?.match(/^\s*/)?.[0] ?? ""
  const indentation =
    firstStatement?.loc && firstStatement.loc.start.line > (body.loc?.start.line ?? 0)
      ? " ".repeat(firstStatement.loc.start.column)
      : `${functionIndentation}  `

  return {
    messageId: "moveRequire",
    data: { functionName: consumer.name },
    fix: (fixer) => [
      fixer.remove(declaration),
      fixer.insertTextAfterRange(
        [body.range![0], body.range![0] + 1],
        `\n${indentation}${declarationText}`,
      ),
    ],
  }
}

const noGlobalRequire: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow top-level require bindings that are not needed by every exported SiteGenesis route.",
      url: "https://commerce-klaus.github.io/commerce-klaus/packages/eslint-config-sfcc/rules/sitegenesis/no-global-require",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          allowShared: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      moveRequire: 'Move this require into "{{functionName}}()".',
      routeSpecificRequire:
        '"{{name}}" is not needed by every exported route. Move it into the function or functions that use it.',
      sharedRequire:
        '"{{name}}" is shared by some, but not all exported routes. Move it into the consumers or enable allowShared for intentional shared dependencies.',
    },
  },
  create: (context) => {
    const normalizedFilename = normalizeFilePath(context.filename)
    if (!normalizedFilename.includes("/cartridge/controllers/")) {
      return {}
    }

    const options = context.options[0] as RuleOptions | undefined
    const functions: FunctionEntry[] = []
    const requires = new Map<string, RequireEntry>()
    const exportedFunctionNames = new Set<string>()
    const exportedFunctionNodes = new Set<Rule.Node>()

    function processFunction(node: Rule.Node): void {
      const scope = context.sourceCode.getScope(node)
      if (scope.upper?.block?.type !== "Program") {
        return
      }

      functions.push({
        dependencies: new Set(
          scope.through
            .filter((reference) => reference.from.type === "function")
            .map((reference) => reference.identifier.name)
            .filter((name) => requires.has(name)),
        ),
        name: getFunctionName(node),
        node,
      })
    }

    return {
      Program(node) {
        const globalScope = getGlobalScope(context, node as Rule.Node)

        for (const variable of globalScope.variables.filter(isReadOnlyVariable)) {
          if (variable.name === "arguments" || getRequireCalleeName(variable) !== "require") {
            continue
          }

          requires.set(variable.name, {
            variable,
            usedGlobally: globalScope.references.some(
              (reference) => !reference.init && reference.identifier.name === variable.name,
            ),
          })
        }
      },
      AssignmentExpression(node) {
        const exportName = getExportName(node.left as Rule.Node)
        if (!exportName) {
          return
        }

        const target = getRouteTarget(node.right as Rule.Node)
        if (target?.type === "Identifier") {
          exportedFunctionNames.add(target.name)
        } else if (target) {
          exportedFunctionNodes.add(target)
        }
      },
      FunctionExpression(node) {
        processFunction(node as Rule.Node)
      },
      FunctionDeclaration(node) {
        processFunction(node as Rule.Node)
      },
      ArrowFunctionExpression(node) {
        processFunction(node as Rule.Node)
      },
      "Program:exit"() {
        const routes = functions.filter(
          (entry) => exportedFunctionNodes.has(entry.node) || exportedFunctionNames.has(entry.name),
        )
        if (routes.length === 0) {
          return
        }

        for (const [name, entry] of requires) {
          if (entry.usedGlobally) {
            continue
          }

          const routeConsumers = routes.filter((route) => route.dependencies.has(name))
          if (routeConsumers.length === routes.length) {
            continue
          }

          const consumers = functions.filter((candidate) => candidate.dependencies.has(name))
          if (options?.allowShared && consumers.length > 1) {
            continue
          }

          const reportNode = getReportNode(entry.variable)
          if (!reportNode) {
            continue
          }

          const suggestion =
            consumers.length === 1
              ? buildMoveSuggestion(context, entry.variable, consumers[0] as FunctionEntry)
              : undefined

          context.report({
            node: reportNode,
            messageId: consumers.length > 1 ? "sharedRequire" : "routeSpecificRequire",
            data: { name },
            suggest: suggestion ? [suggestion] : [],
          })
        }
      },
    }
  },
}

export default noGlobalRequire
