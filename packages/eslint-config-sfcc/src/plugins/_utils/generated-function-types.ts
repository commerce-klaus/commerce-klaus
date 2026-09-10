import type { Rule } from "eslint"

import { isExportsPropertyAssignment, isModuleExportsMemberExpression } from "./commonjs-exports.ts"

type NodeWithName = Rule.Node & { name?: string }
export type ProgramNode = Rule.Node & { body: Rule.Node[] }
type SourceComment = ReturnType<Rule.RuleContext["sourceCode"]["getCommentsBefore"]>[number]

interface ExportedFunction {
  annotationTarget: Rule.Node
  functionNode?: Rule.Node
}

function findDeclaration(program: ProgramNode, name: string): ExportedFunction | undefined {
  for (const statement of program.body) {
    if (
      statement.type === "FunctionDeclaration" &&
      (statement as Rule.Node & { id?: NodeWithName }).id?.name === name
    ) {
      return { annotationTarget: statement, functionNode: statement }
    }

    if (statement.type !== "VariableDeclaration") {
      continue
    }

    const declarations = (statement as Rule.Node & { declarations: Rule.Node[] }).declarations
    const declaration = declarations.find(
      (candidate) =>
        candidate.type === "VariableDeclarator" &&
        (candidate as Rule.Node & { id: NodeWithName }).id.name === name,
    ) as (Rule.Node & { init?: Rule.Node }) | undefined
    if (declaration) {
      const functionNode =
        declaration.init?.type === "FunctionExpression" ||
        declaration.init?.type === "ArrowFunctionExpression"
          ? declaration.init
          : undefined
      return { annotationTarget: statement, functionNode }
    }
  }

  return undefined
}

export function findExportedFunction(
  program: ProgramNode,
  exportName: string,
): ExportedFunction | undefined {
  for (const statement of program.body) {
    if (statement.type !== "ExpressionStatement") {
      continue
    }

    const expression = (statement as Rule.Node & { expression: Rule.Node }).expression
    if (expression.type !== "AssignmentExpression") {
      continue
    }

    const assignment = expression as Rule.Node & {
      left: Rule.Node
      operator: string
      right: Rule.Node & { name?: string; properties?: Rule.Node[] }
    }
    if (assignment.operator !== "=") {
      continue
    }

    if (isExportsPropertyAssignment(assignment.left, exportName)) {
      if (assignment.right.type === "Identifier") {
        return (
          findDeclaration(program, assignment.right.name ?? "") ?? {
            annotationTarget: statement,
          }
        )
      }

      const functionNode =
        assignment.right.type === "FunctionExpression" ||
        assignment.right.type === "ArrowFunctionExpression"
          ? assignment.right
          : undefined
      return { annotationTarget: statement, functionNode }
    }

    if (
      !isModuleExportsMemberExpression(assignment.left) ||
      assignment.right.type !== "ObjectExpression"
    ) {
      continue
    }

    const property = assignment.right.properties?.find((candidate) => {
      if (candidate.type !== "Property") {
        return false
      }
      const key = (candidate as Rule.Node & { key: NodeWithName }).key
      return key.name === exportName
    })
    const value = property && (property as Rule.Node & { value: NodeWithName }).value
    if (value?.type === "Identifier") {
      return findDeclaration(program, value.name ?? "") ?? { annotationTarget: statement }
    }
    if (property) {
      const functionNode =
        value?.type === "FunctionExpression" || value?.type === "ArrowFunctionExpression"
          ? value
          : undefined
      return { annotationTarget: statement, functionNode }
    }
  }

  return undefined
}

export function findExportAnnotationTarget(
  program: ProgramNode,
  exportName: string,
): Rule.Node | undefined {
  return findExportedFunction(program, exportName)?.annotationTarget
}

function getJsdocComments(context: Rule.RuleContext, node: Rule.Node): SourceComment[] {
  return context.sourceCode
    .getCommentsBefore(node)
    .filter((comment) => comment.type === "Block" && comment.value.trimStart().startsWith("*"))
}

export function getTypeComment(
  context: Rule.RuleContext,
  node: Rule.Node,
): { comment: SourceComment; type: string } | undefined {
  for (const comment of getJsdocComments(context, node).toReversed()) {
    const match = /@type\s*\{([^}]+)\}/u.exec(comment.value)
    if (match?.[1]) {
      return { comment, type: match[1].trim() }
    }
  }
  return undefined
}

export function createGeneratedTypeSuggestion(
  context: Rule.RuleContext,
  node: Rule.Node,
  expectedType: string,
  typeComment: ReturnType<typeof getTypeComment>,
): Rule.SuggestionReportDescriptor {
  return {
    messageId: "useGeneratedType",
    data: { expectedType },
    fix(fixer) {
      if (typeComment) {
        const { range } = typeComment.comment
        if (!range) {
          return null
        }
        const commentText = context.sourceCode.text.slice(...range)
        return fixer.replaceTextRange(
          range,
          commentText.replace(/(@type\s*\{)[^}]+(\})/u, `$1${expectedType}$2`),
        )
      }

      const jsdoc = getJsdocComments(context, node).at(-1)
      if (jsdoc) {
        const { range } = jsdoc
        if (!range) {
          return null
        }
        const commentText = context.sourceCode.text.slice(...range)
        return fixer.replaceTextRange(
          range,
          commentText.replace(/\s*\*\/$/u, `\n * @type {${expectedType}}\n */`),
        )
      }

      const indentation = " ".repeat(node.loc?.start.column ?? 0)
      return fixer.insertTextBefore(node, `/** @type {${expectedType}} */\n${indentation}`)
    },
  }
}
