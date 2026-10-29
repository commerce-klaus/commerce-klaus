import type { ESLint, Linter } from "eslint"

import path from "node:path"

export type EmptyMigrationCategory = "ambiguous" | "autofixable" | "review"

export interface EmptyMigrationDiagnostic {
  category: EmptyMigrationCategory
  column: number
  filePath: string
  line: number
  message: string
  ruleId: string
}

const CATEGORY_LABELS: Record<EmptyMigrationCategory, string> = {
  ambiguous: "AMBIGUOUS",
  autofixable: "AUTOFIX",
  review: "REVIEW",
}

const CATEGORY_ORDER: EmptyMigrationCategory[] = ["autofixable", "review", "ambiguous"]

export default function formatEmptyMigrationResults(
  results: ESLint.LintResult[],
  data: ESLint.LintResultData,
): string {
  const migrationDiagnostics = collectMigrationDiagnostics(results)
  const otherDiagnostics = collectOtherDiagnostics(results)
  const lines = ["SFCC empty() migration report", ""]

  if (migrationDiagnostics.length === 0) {
    lines.push("No empty() migration diagnostics found.")
  } else {
    lines.push(`Unique global empty() calls: ${migrationDiagnostics.length}`)
    for (const category of CATEGORY_ORDER) {
      const count = migrationDiagnostics.filter(
        (diagnostic) => diagnostic.category === category,
      ).length
      lines.push(`  ${CATEGORY_LABELS[category]}: ${count}`)
    }

    lines.push("", "By file:")
    const byFile = new Map<string, EmptyMigrationDiagnostic[]>()
    for (const diagnostic of migrationDiagnostics) {
      const diagnostics = byFile.get(diagnostic.filePath) ?? []
      diagnostics.push(diagnostic)
      byFile.set(diagnostic.filePath, diagnostics)
    }
    for (const [filePath, diagnostics] of [...byFile.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      lines.push(relativeFilePath(data.cwd, filePath))
      for (const diagnostic of diagnostics) {
        lines.push(
          `  ${diagnostic.line}:${diagnostic.column} ${CATEGORY_LABELS[diagnostic.category]} ${diagnostic.message}`,
        )
      }
    }
  }

  if (otherDiagnostics.length > 0) {
    lines.push("", `Other ESLint diagnostics: ${otherDiagnostics.length}`)
    for (const diagnostic of otherDiagnostics) {
      const severity = diagnostic.message.severity === 2 ? "error" : "warning"
      lines.push(
        `${relativeFilePath(data.cwd, diagnostic.filePath)}:${diagnostic.message.line}:${diagnostic.message.column} ${severity} ${diagnostic.message.ruleId ?? "fatal"} ${diagnostic.message.message}`,
      )
    }
  }

  return `${lines.join("\n")}\n`
}

export function collectMigrationDiagnostics(
  results: ESLint.LintResult[],
): EmptyMigrationDiagnostic[] {
  const byLocation = new Map<string, EmptyMigrationDiagnostic>()

  for (const result of results) {
    for (const message of result.messages) {
      const category = getMigrationCategory(message)
      if (!category || !message.ruleId) {
        continue
      }

      const diagnostic: EmptyMigrationDiagnostic = {
        category,
        column: message.column,
        filePath: result.filePath,
        line: message.line,
        message: message.message,
        ruleId: message.ruleId,
      }
      const key = `${result.filePath}:${message.line}:${message.column}`
      const existing = byLocation.get(key)
      if (
        !existing ||
        CATEGORY_ORDER.indexOf(diagnostic.category) > CATEGORY_ORDER.indexOf(existing.category)
      ) {
        byLocation.set(key, diagnostic)
      }
    }
  }

  return [...byLocation.values()].sort(
    (left, right) =>
      left.filePath.localeCompare(right.filePath) ||
      left.line - right.line ||
      left.column - right.column,
  )
}

function getMigrationCategory(message: Linter.LintMessage): EmptyMigrationCategory | undefined {
  if (message.ruleId === "sfcc/no-ambiguous-empty") {
    return "ambiguous"
  }

  if (message.ruleId === "sfcc/prefer-explicit-empty-check") {
    return message.fix ? "autofixable" : "review"
  }

  return undefined
}

function collectOtherDiagnostics(
  results: ESLint.LintResult[],
): Array<{ filePath: string; message: Linter.LintMessage }> {
  return results
    .flatMap((result) =>
      result.messages
        .filter((message) => getMigrationCategory(message) === undefined)
        .map((message) => ({ filePath: result.filePath, message })),
    )
    .sort(
      (left, right) =>
        left.filePath.localeCompare(right.filePath) ||
        left.message.line - right.message.line ||
        left.message.column - right.message.column,
    )
}

function relativeFilePath(cwd: string, filePath: string): string {
  const relativePath = path.relative(cwd, filePath)
  return (relativePath || path.basename(filePath)).replaceAll("\\", "/")
}
