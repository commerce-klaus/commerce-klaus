import path from "node:path"

import type { ExplainResult } from "./commands/klaus/explain.js"
import type { ResolveResult } from "./commands/klaus/resolve.js"
import type { DoctorResult, ProjectGraph, ProjectInspection, ProjectValidation } from "./project.js"

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

export function renderProjectGraph(
  result: ProjectGraph,
  currentDirectory: string,
  colorize: Colorize,
): string {
  const lines = [
    `Graphing SFCC project in ${colorize("dim", displayPath(result.cartridgesDirectory, currentDirectory))}`,
    `Cartridges: ${formatResultCount(result.cartridgeOrder.length, "cartridge", "none found", colorize)}`,
    ...result.cartridgeOrder.map(
      (cartridgeRoot, index) => `  ${index + 1}. ${path.basename(cartridgeRoot)}`,
    ),
    `Relationships: ${formatResultCount(result.edges.length, "edge", "none found", colorize)}`,
  ]
  const nodesById = new Map(result.nodes.map((node) => [node.id, node]))
  for (const edge of result.edges) {
    const source = nodesById.get(edge.from)?.label ?? edge.from
    const target = nodesById.get(edge.to)?.label ?? edge.to
    lines.push(`  ${source} ${colorize("dim", `--${edge.kind}-->`)} ${target}`)
  }
  lines.push(`${colorize("green", "DONE")}: Project graph generated.`)

  return lines.join("\n")
}

export function renderProjectGraphDot(result: ProjectGraph): string {
  const shapes: Record<ProjectGraph["nodes"][number]["kind"], string> = {
    cartridge: "folder",
    "custom-api": "component",
    hook: "hexagon",
    "job-step": "box",
    module: "note",
    schema: "cylinder",
  }
  const lines = [
    "digraph sfcc_project {",
    '  rankdir="LR";',
    ...result.nodes.map(
      (node) =>
        `  "${escapeDot(node.id)}" [label="${escapeDot(node.label)}", shape="${shapes[node.kind]}"];`,
    ),
    ...result.edges.map(
      (edge) =>
        `  "${escapeDot(edge.from)}" -> "${escapeDot(edge.to)}" [label="${escapeDot(edge.kind)}"];`,
    ),
    "}",
  ]

  return lines.join("\n")
}

function escapeDot(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")
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

export function renderResolutionTrace(
  result: ExplainResult,
  currentDirectory: string,
  colorize: Colorize,
): string {
  const lines = [
    `Explaining SFCC module ${colorize("dim", result.moduleName)}`,
    `Mode: ${result.kind}`,
    `Importer: ${colorize("dim", displayPath(result.containingFile, currentDirectory))}`,
  ]

  if (result.containingCartridge) {
    lines.push(`Containing cartridge: ${path.basename(result.containingCartridge)}`)
  }

  lines.push(
    `Cartridge path: ${formatResultCount(result.cartridgeOrder.length, "cartridge", "none found", colorize)}`,
  )
  for (const [index, cartridgeRoot] of result.cartridgeOrder.entries()) {
    lines.push(`  ${index + 1}. ${path.basename(cartridgeRoot)}`)
  }

  lines.push(`Search: ${formatResultCount(result.attempts.length, "location", "none", colorize)}`)
  for (const attempt of result.attempts) {
    if (attempt.cartridge) {
      lines.push(`  ${path.basename(attempt.cartridge)}`)
    }
    for (const candidate of attempt.candidates) {
      const matched = candidate === attempt.resolved
      lines.push(
        `    ${matched ? colorize("green", "MATCH") : colorize("dim", "MISS ")} ${colorize("dim", displayPath(candidate, currentDirectory))}`,
      )
      if (matched) {
        break
      }
    }
  }

  lines.push(
    result.resolved
      ? `Resolved: ${colorize("green", displayPath(result.resolved, currentDirectory))}`
      : `Resolved: ${colorize("yellow", "no matching module found")}`,
  )
  lines.push(
    result.resolved
      ? `${colorize("green", "DONE")}: Resolution trace completed.`
      : `${colorize("yellow", "MISS")}: Resolution trace completed without a match.`,
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

export function renderValidation(
  result: ProjectValidation,
  currentDirectory: string,
  colorize: Colorize,
): string {
  const lines = [
    `Validating SFCC project in ${colorize("dim", displayPath(result.cartridgesDirectory, currentDirectory))}`,
  ]

  for (const diagnostic of result.diagnostics) {
    const label =
      diagnostic.severity === "error" ? colorize("red", "ERROR") : colorize("yellow", "WARN")
    lines.push(
      `${label} [${diagnostic.code}]: ${diagnostic.message} ${colorize("dim", displayPath(diagnostic.file, currentDirectory))}`,
    )
  }

  const summary = `${formatCount(result.errors, "error")}, ${formatCount(result.warnings, "warning")}`
  lines.push(
    result.ok
      ? `${colorize("green", "PASS")}: Project validation completed with ${summary}.`
      : `${colorize("red", "FAIL")}: Project validation found ${summary}.`,
  )
  return lines.join("\n")
}

export function renderValidationSarif(result: ProjectValidation, currentDirectory: string): string {
  const ruleIds = [...new Set(result.diagnostics.map((diagnostic) => diagnostic.code))].sort()
  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Commerce Klaus",
            informationUri: "https://commerce-klaus.github.io/commerce-klaus/",
            rules: ruleIds.map((ruleId) => ({ id: ruleId })),
          },
        },
        results: result.diagnostics.map((diagnostic) => ({
          ruleId: diagnostic.code,
          level: diagnostic.severity,
          message: { text: diagnostic.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: toRelativeUri(diagnostic.file, currentDirectory),
                },
              },
            },
          ],
        })),
      },
    ],
  }

  return JSON.stringify(sarif, undefined, 2)
}

function toRelativeUri(filePath: string, currentDirectory: string): string {
  return path
    .relative(currentDirectory, filePath)
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}
