import { Command, Flags, ux } from "@oclif/core"
import fs from "node:fs"
import path from "node:path"

import { renderProjectGraph, renderProjectGraphDot } from "../../output.js"
import { getProjectGraph, type ProjectGraph } from "../../project.js"

export default class Graph extends Command {
  static enableJsonFlag = true
  static summary = "Visualize SFCC cartridge and contract relationships"
  static examples = [
    "<%= config.bin %> klaus graph",
    "<%= config.bin %> klaus graph --module '*/cartridge/models/product'",
    "<%= config.bin %> klaus graph --format dot --output sfcc-project.dot",
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
      description: "Human-readable text, Graphviz DOT, or JSON output",
      options: ["dot", "json", "text"],
      default: "text",
    }),
    module: Flags.string({
      description: "Focus on a */cartridge/... module across the cartridge path",
    }),
    output: Flags.string({
      char: "o",
      description: "Write the graph to a file",
    }),
  }

  async run(): Promise<ProjectGraph> {
    const { flags } = await this.parse(Graph)
    if (this.jsonEnabled() && flags.format === "dot") {
      this.error("--format dot cannot be combined with --json")
    }
    if (this.jsonEnabled() && flags.output) {
      this.error("--output cannot be combined with --json; use --format json instead")
    }

    let result: ProjectGraph
    try {
      result = getProjectGraph({
        cwd: process.cwd(),
        cartridgesDir: flags["cartridges-dir"],
        cartridgePath: flags["cartridge-path"],
        module: flags.module,
      })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (flags.output) {
      const outputPath = path.resolve(process.cwd(), flags.output)
      const content = renderGraph(result, flags.format, process.cwd())
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
      ux.stdout(renderGraph(result, flags.format, process.cwd(), ux.colorize))
    }

    return result
  }
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
    default:
      return renderProjectGraph(result, currentDirectory, colorize)
  }
}
