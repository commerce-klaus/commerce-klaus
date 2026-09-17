import path from "node:path"

import type { ResolveResult } from "./commands/klaus/resolve.js"
import type { DoctorResult, ProjectInspection } from "./project.js"

export type OutputStyle = "dim" | "green" | "red" | "yellow"
export type Colorize = (style: OutputStyle, text: string) => string

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function displayPath(filePath: string, currentDirectory: string): string {
  return path.relative(currentDirectory, filePath).replaceAll(path.sep, "/") || "."
}

function formatResultCount(
  count: number,
  singular: string,
  emptyMessage: string,
  colorize: Colorize,
): string {
  return count > 0
    ? colorize("green", formatCount(count, singular))
    : colorize("yellow", emptyMessage)
}

export function renderInspection(
  result: ProjectInspection,
  currentDirectory: string,
  colorize: Colorize,
): string {
  const lines = [
    `Inspecting SFCC project in ${colorize("dim", displayPath(result.cartridgesDirectory, currentDirectory))}`,
    `Cartridges: ${formatResultCount(result.cartridgeOrder.length, "cartridge", "none found", colorize)}`,
    ...result.cartridgeOrder.map(
      (cartridgeRoot, index) =>
        `  ${index + 1}. ${path.basename(cartridgeRoot)} ${colorize("dim", displayPath(cartridgeRoot, currentDirectory))}`,
    ),
    `Hooks: ${formatResultCount(result.hooks.length, "registration", "none found", colorize)}`,
    `Job steps: ${formatResultCount(result.jobSteps.length, "definition", "none found", colorize)}`,
    `Custom APIs: ${formatResultCount(result.customApis.length, "contract", "none found", colorize)}`,
    `${colorize("green", "DONE")}: Project inspection completed.`,
  ]

  return lines.join("\n")
}

export function renderResolution(
  result: ResolveResult,
  currentDirectory: string,
  colorize: Colorize,
): string {
  const lines = [`Resolving SFCC module ${colorize("dim", result.module)}`]

  if (result.resolved) {
    lines.push(`Resolved: ${colorize("green", displayPath(result.resolved, currentDirectory))}`)
  } else {
    lines.push(`Resolved: ${colorize("yellow", "no matching module found")}`)
  }

  lines.push(
    `Cartridge path: ${formatResultCount(result.cartridgeOrder.length, "cartridge", "none found", colorize)}`,
  )
  for (const [index, cartridgeRoot] of result.cartridgeOrder.entries()) {
    lines.push(`  ${index + 1}. ${path.basename(cartridgeRoot)}`)
  }

  if (result.candidates.length > 1) {
    lines.push(`Candidates: ${colorize("green", formatCount(result.candidates.length, "match"))}`)
    for (const [index, candidate] of result.candidates.entries()) {
      const candidatePath = displayPath(candidate, currentDirectory)
      lines.push(
        `  ${index + 1}. ${index === 0 ? colorize("green", candidatePath) : colorize("dim", candidatePath)}`,
      )
    }
  }

  lines.push(
    result.resolved
      ? `${colorize("green", "DONE")}: Module resolution completed.`
      : `${colorize("yellow", "MISS")}: Module could not be resolved.`,
  )
  return lines.join("\n")
}

export function renderDoctor(
  result: DoctorResult,
  currentDirectory: string,
  colorize: Colorize,
): string {
  const lines = [
    `Checking SFCC project in ${colorize("dim", displayPath(result.cartridgesDirectory, currentDirectory))}`,
  ]

  for (const finding of result.findings) {
    const label = finding.level === "error" ? colorize("red", "ERROR") : colorize("yellow", "WARN")
    lines.push(`${label}: ${finding.message}`)
  }

  lines.push(
    result.ok
      ? `${colorize("green", "PASS")}: Project configuration looks valid.`
      : `${colorize("red", "FAIL")}: Project configuration has errors.`,
  )
  return lines.join("\n")
}
