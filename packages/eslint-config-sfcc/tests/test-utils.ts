import tseslint from "@typescript-eslint/eslint-plugin"
import { ESLint, type Linter } from "eslint"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { createRecommendedConfig } from "../src/index.js"

type SuggestionFix = {
  range: [number, number]
  text: string
}

export function createTypeScriptRecommendedConfig(files: string[]): Linter.Config[] {
  const tsRecommended = tseslint.configs["flat/recommended"] as unknown as
    | Linter.Config
    | Linter.Config[]

  return [
    ...(Array.isArray(tsRecommended) ? tsRecommended : [tsRecommended]),
    ...createRecommendedConfig({ files, ignores: [] }),
  ]
}

export function withTemporaryCwd<T>(prefix: string, run: (temporaryDir: string) => T): T {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  const previousCwd = process.cwd()

  try {
    process.chdir(temporaryDir)
    return run(temporaryDir)
  } finally {
    process.chdir(previousCwd)
    fs.rmSync(temporaryDir, { recursive: true, force: true })
  }
}

export function writeJson(filePath: string, content: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

export async function lintText(
  config: Linter.Config | Linter.Config[],
  code: string,
  filename: string,
): Promise<Linter.LintMessage[]> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  })

  const results = await eslint.lintText(code, { filePath: filename })
  return results[0]?.messages ?? []
}

export function applySuggestion(
  code: string,
  suggestion: { fix?: SuggestionFix | SuggestionFix[] },
): string {
  const fixes = Array.isArray(suggestion.fix)
    ? [...suggestion.fix]
    : suggestion.fix
      ? [suggestion.fix]
      : []

  return fixes
    .sort((left, right) => right.range[0] - left.range[0])
    .reduce(
      (output, fix) => `${output.slice(0, fix.range[0])}${fix.text}${output.slice(fix.range[1])}`,
      code,
    )
}
