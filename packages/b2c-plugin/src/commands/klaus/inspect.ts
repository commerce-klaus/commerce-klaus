import { Command, Flags, ux } from "@oclif/core"

import { renderInspection } from "../../output.js"
import { getProjectInspection, type ProjectInspection } from "../../project.js"

export default class Inspect extends Command {
  static enableJsonFlag = true
  static summary = "Inspect the effective SFCC project configuration"
  static examples = ["<%= config.bin %> klaus inspect", "<%= config.bin %> klaus inspect --json"]
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Directory containing the project cartridges",
      default: "cartridges",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
  }

  async run(): Promise<ProjectInspection> {
    const { flags } = await this.parse(Inspect)
    const result = getProjectInspection({
      cwd: process.cwd(),
      cartridgesDir: flags["cartridges-dir"],
      cartridgePath: flags["cartridge-path"],
    })

    if (!this.jsonEnabled()) {
      ux.stdout(renderInspection(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
