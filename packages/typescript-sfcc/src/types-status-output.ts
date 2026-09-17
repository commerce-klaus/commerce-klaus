import path from "node:path"

import type { TypesStatusEntry, TypesStatusResult, TypesStatusState } from "./types-status.ts"

export type TypesStatusOutputStyle = "dim" | "green" | "red" | "yellow"
export type TypesStatusColorize = (style: TypesStatusOutputStyle, text: string) => string

export function renderTypesStatus(
  result: TypesStatusResult,
  colorize: TypesStatusColorize = (_style, text) => text,
): string {
  const lines = [
    `Checking SFCC type status in ${colorize("dim", result.projectDirectory)}`,
    renderEntry(result.scriptTypes, result.projectDirectory, colorize),
    ...result.generatedTypes.map((entry) => renderEntry(entry, result.projectDirectory, colorize)),
    result.current
      ? `${colorize("green", "PASS")}: SFCC types are up to date.`
      : `${colorize("red", "FAIL")}: Run ${colorize("dim", "b2c klaus types sync")} to update SFCC types.`,
  ]

  return lines.join("\n")
}

function renderEntry(
  entry: TypesStatusEntry & { minimumVersion?: string; version?: string },
  projectDirectory: string,
  colorize: TypesStatusColorize,
): string {
  const version = entry.version ? ` (version ${entry.version})` : ""
  const minimumVersion = entry.minimumVersion ? `, requires ${entry.minimumVersion}` : ""
  return `${entry.name}: ${renderState(entry.state, colorize)}${version}${minimumVersion} ${colorize("dim", displayPath(entry.path, projectDirectory))}`
}

function renderState(state: TypesStatusState, colorize: TypesStatusColorize): string {
  switch (state) {
    case "current":
      return colorize("green", "current")
    case "missing":
      return colorize("red", "missing")
    case "stale":
      return colorize("yellow", "stale")
    case "not-required":
      return colorize("dim", "not required")
  }
}

function displayPath(filePath: string, projectDirectory: string): string {
  return path.relative(projectDirectory, filePath).replaceAll(path.sep, "/") || "."
}
