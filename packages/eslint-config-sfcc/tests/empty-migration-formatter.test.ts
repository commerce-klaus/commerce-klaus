import type { ESLint, Linter } from "eslint"

import path from "node:path"
import { expect, test } from "vite-plus/test"

import formatEmptyMigrationResults, {
  collectMigrationDiagnostics,
} from "../src/formatters/empty-migration.js"

const cwd = path.resolve("/workspace")

function message(
  ruleId: string | null,
  line: number,
  column: number,
  options: { fix?: boolean; severity?: 1 | 2; text?: string } = {},
): Linter.LintMessage {
  return {
    column,
    endColumn: column + 1,
    endLine: line,
    line,
    message: options.text ?? "Sample diagnostic",
    ruleId,
    severity: options.severity ?? 2,
    ...(options.fix
      ? {
          fix: {
            range: [0, 1] as [number, number],
            text: "replacement",
          },
        }
      : {}),
  }
}

function result(filePath: string, messages: Linter.LintMessage[]): ESLint.LintResult {
  return {
    errorCount: messages.filter((item) => item.severity === 2).length,
    fatalErrorCount: 0,
    filePath: path.join(cwd, filePath),
    fixableErrorCount: messages.filter((item) => item.severity === 2 && item.fix).length,
    fixableWarningCount: messages.filter((item) => item.severity === 1 && item.fix).length,
    messages,
    suppressedMessages: [],
    usedDeprecatedRules: [],
    warningCount: messages.filter((item) => item.severity === 1).length,
  }
}

const data: ESLint.LintResultData = {
  cwd,
  rulesMeta: {},
}

test("groups empty migration diagnostics by action and file", () => {
  const output = formatEmptyMigrationResults(
    [
      result("cartridges/app_two/script.js", [
        message("sfcc/no-ambiguous-empty", 8, 3, { text: "Choose a contract." }),
      ]),
      result("cartridges/app_one/script.js", [
        message("sfcc/prefer-explicit-empty-check", 4, 5, {
          fix: true,
          text: "Use a length check.",
        }),
        message("sfcc/prefer-explicit-empty-check", 12, 5, {
          text: "Cache the value first.",
        }),
      ]),
    ],
    data,
  )

  expect(output).toContain("Unique global empty() calls: 3")
  expect(output).toContain("AUTOFIX: 1")
  expect(output).toContain("REVIEW: 1")
  expect(output).toContain("AMBIGUOUS: 1")
  expect(output.indexOf("app_one/script.js")).toBeLessThan(output.indexOf("app_two/script.js"))
})

test("deduplicates overlapping diagnostics at one source location", () => {
  const diagnostics = collectMigrationDiagnostics([
    result("cartridges/app_custom/script.js", [
      message("sfcc/prefer-explicit-empty-check", 4, 3, { fix: true }),
      message("sfcc/no-ambiguous-empty", 4, 3),
    ]),
  ])

  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0]?.category).toBe("ambiguous")
})

test("preserves unrelated ESLint diagnostics", () => {
  const output = formatEmptyMigrationResults(
    [
      result("cartridges/app_custom/script.js", [
        message("sfcc/no-ambiguous-empty", 4, 3),
        message("no-unused-vars", 9, 7, {
          severity: 1,
          text: "Unused value.",
        }),
      ]),
    ],
    data,
  )

  expect(output).toContain("Other ESLint diagnostics: 1")
  expect(output).toContain("9:7 warning no-unused-vars Unused value.")
})

test("reports a completed migration without hiding other errors", () => {
  const output = formatEmptyMigrationResults(
    [result("cartridges/app_custom/script.js", [message(null, 1, 1, { text: "Parsing failed." })])],
    data,
  )

  expect(output).toContain("No empty() migration diagnostics found.")
  expect(output).toContain("error fatal Parsing failed.")
})
