import { Command, Flags, ux } from "@oclif/core"
import fs from "node:fs"
import path from "node:path"

import {
  renderProjectGraph,
  renderProjectGraphDiff,
  renderProjectGraphDot,
  renderProjectGraphMermaid,
} from "../../output.js"
import {
  getProjectGraph,
  getProjectGraphDiff,
  type ProjectGraph,
  type ProjectGraphDiff,
  type ProjectGraphDirection,
} from "../../project.js"

export default class Graph extends Command {
  static enableJsonFlag = true
  static summary = "Visualize SFCC cartridge and contract relationships"
  static examples = [
    "<%= config.bin %> klaus graph",
    "<%= config.bin %> klaus graph --focus 'Product-Show'",
    "<%= config.bin %> klaus graph --focus 'Product.js' --depth 2 --direction both",
    "<%= config.bin %> klaus graph --cartridge-path app_base --diff app_custom:app_base",
    "<%= config.bin %> klaus graph --module '*/cartridge/models/product'",
    "<%= config.bin %> klaus graph --format dot --output sfcc-project.dot",
    "<%= config.bin %> klaus graph --format mermaid --output sfcc-project.mmd",
    "<%= config.bin %> klaus graph --format json --output sfcc-project.json",
  ]
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Directory containing the project cartridges",
      default: "cartridges",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
    format: Flags.string({
      description: "Human-readable text, Graphviz DOT, Mermaid, or JSON output",
      options: ["dot", "json", "mermaid", "text"],
      default: "text",
    }),
    focus: Flags.string({
      description: "Focus on nodes whose ID, label, or path contains this value",
    }),
    depth: Flags.integer({
      description: "Maximum relationship depth from focused nodes",
    }),
    direction: Flags.string({
      description: "Traverse dependencies, dependents, or both from focused nodes",
      options: ["both", "dependencies", "dependents"],
    }),
    diff: Flags.string({
      description: "Compare the graph with this colon-separated cartridge path",
    }),
    module: Flags.string({
      description: "Focus on a */cartridge/... module across the cartridge path",
    }),
    output: Flags.string({
      char: "o",
      description: "Write the graph to a file",
    }),
  }

  async run(): Promise<ProjectGraph | ProjectGraphDiff> {
    const { flags } = await this.parse(Graph)
    if (this.jsonEnabled() && ["dot", "mermaid"].includes(flags.format)) {
      this.error(`--format ${flags.format} cannot be combined with --json`)
    }
    if (this.jsonEnabled() && flags.output) {
      this.error("--output cannot be combined with --json; use --format json instead")
    }
    if (flags.focus !== undefined && flags.focus.trim() === "") {
      this.error("--focus must not be empty")
    }
    if (flags.diff !== undefined && flags.diff.trim() === "") {
      this.error("--diff must not be empty")
    }
    if (flags.focus && flags.module) {
      this.error("--focus cannot be combined with --module")
    }
    if (flags.depth !== undefined && !flags.focus) {
      this.error("--depth requires --focus")
    }
    if (flags.depth !== undefined && flags.depth < 0) {
      this.error("--depth must be zero or greater")
    }
    if (flags.direction && !flags.focus) {
      this.error("--direction requires --focus")
    }
    if (flags.diff && (flags.focus || flags.module)) {
      this.error("--diff cannot be combined with --focus or --module")
    }
    if (flags.diff && ["dot", "mermaid"].includes(flags.format)) {
      this.error(`--format ${flags.format} cannot be combined with --diff`)
    }

    let result: ProjectGraph | ProjectGraphDiff
    try {
      result = flags.diff
        ? getProjectGraphDiff({
            cwd: process.cwd(),
            cartridgesDir: flags["cartridges-dir"],
            cartridgePath: flags["cartridge-path"],
            comparisonCartridgePath: flags.diff,
          })
        : getProjectGraph({
            cwd: process.cwd(),
            cartridgesDir: flags["cartridges-dir"],
            cartridgePath: flags["cartridge-path"],
            depth: flags.depth,
            direction: flags.direction as ProjectGraphDirection | undefined,
            focus: flags.focus,
            module: flags.module,
          })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (flags.output) {
      const outputPath = path.resolve(process.cwd(), flags.output)
      const content = flags.diff
        ? renderGraphDiff(result as ProjectGraphDiff, flags.format, process.cwd())
        : renderGraph(result as ProjectGraph, flags.format, process.cwd())
      try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        fs.writeFileSync(outputPath, `${content}\n`, "utf8")
      } catch (error) {
        this.error(error instanceof Error ? error : String(error))
      }
      ux.stdout(
        `${ux.colorize("green", "DONE")}: Project graph written to ${ux.colorize("dim", flags.output)}.`,
      )
    } else if (!this.jsonEnabled()) {
      ux.stdout(
        flags.diff
          ? renderGraphDiff(result as ProjectGraphDiff, flags.format, process.cwd(), ux.colorize)
          : renderGraph(result as ProjectGraph, flags.format, process.cwd(), ux.colorize),
      )
    }

    return result
  }
}

function renderGraphDiff(
  result: ProjectGraphDiff,
  format: string,
  currentDirectory: string,
  colorize = (_style: "dim" | "green" | "red" | "yellow", text: string) => text,
): string {
  return format === "json"
    ? JSON.stringify(result, undefined, 2)
    : renderProjectGraphDiff(result, currentDirectory, colorize)
}

function renderGraph(
  result: ProjectGraph,
  format: string,
  currentDirectory: string,
  colorize = (_style: "dim" | "green" | "red" | "yellow", text: string) => text,
): string {
  switch (format) {
    case "dot":
      return renderProjectGraphDot(result)
    case "json":
      return JSON.stringify(result, undefined, 2)
    case "mermaid":
      return renderProjectGraphMermaid(result)
    default:
      return renderProjectGraph(result, currentDirectory, colorize)
  }
}
