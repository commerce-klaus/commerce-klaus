import { Command, Flags, ux } from "@oclif/core"

import { renderProjectGraph, renderProjectGraphDot } from "../../output.js"
import { getProjectGraph, type ProjectGraph } from "../../project.js"

export default class Graph extends Command {
  static enableJsonFlag = true
  static summary = "Visualize SFCC cartridge and contract relationships"
  static examples = [
    "<%= config.bin %> klaus graph",
    "<%= config.bin %> klaus graph --module '*/cartridge/models/product'",
    "<%= config.bin %> klaus graph --format dot > sfcc-project.dot",
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
      description: "Human-readable text or Graphviz DOT output",
      options: ["dot", "text"],
      default: "text",
    }),
    module: Flags.string({
      description: "Focus on a */cartridge/... module across the cartridge path",
    }),
  }

  async run(): Promise<ProjectGraph> {
    const { flags } = await this.parse(Graph)
    if (this.jsonEnabled() && flags.format === "dot") {
      this.error("--format dot cannot be combined with --json")
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

    if (!this.jsonEnabled()) {
      ux.stdout(
        flags.format === "dot"
          ? renderProjectGraphDot(result)
          : renderProjectGraph(result, process.cwd(), ux.colorize),
      )
    }

    return result
  }
}
