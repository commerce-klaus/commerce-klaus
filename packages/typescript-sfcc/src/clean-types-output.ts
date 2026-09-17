import path from "node:path"

import type { CleanGeneratedTypesResult } from "./clean-types.ts"

export type CleanTypesOutputStyle = "dim" | "green" | "yellow"
export type CleanTypesColorize = (style: CleanTypesOutputStyle, text: string) => string

export function renderCleanGeneratedTypes(
  result: CleanGeneratedTypesResult,
  colorize: CleanTypesColorize = (_style, text) => text,
): string {
  const matchingFiles = result.files.filter((file) => file.exists)
  const lines = [
    `${result.dryRun ? "Previewing cleanup" : "Cleaning generated SFCC types"} in ${colorize("dim", result.projectDirectory)}`,
  ]

  for (const file of matchingFiles) {
    const action = result.dryRun ? colorize("yellow", "Would remove") : colorize("green", "Removed")
    lines.push(`  ${action}: ${colorize("dim", displayPath(file.path, result.projectDirectory))}`)
  }

  if (matchingFiles.length === 0) {
    lines.push(`Generated types: ${colorize("yellow", "no generated files found")}`)
  }

  const count = matchingFiles.length
  const noun = count === 1 ? "file" : "files"
  const summary = result.dryRun
    ? `Dry run found ${count} generated type ${noun}.`
    : count === 0
      ? "No generated type files to remove."
      : `Removed ${count} generated type ${noun}.`
  lines.push(`${colorize("green", "DONE")}: ${summary}`)

  return lines.join("\n")
}

function displayPath(filePath: string, projectDirectory: string): string {
  return path.relative(projectDirectory, filePath).replaceAll(path.sep, "/") || "."
}
