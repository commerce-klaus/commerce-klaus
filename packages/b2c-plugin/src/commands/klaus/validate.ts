import { Command, Flags, ux } from "@oclif/core"

import { renderValidation } from "../../output.js"
import { validateProject, type ProjectValidation } from "../../project.js"

export default class Validate extends Command {
  static enableJsonFlag = true
  static summary = "Validate SFCC project contracts"
  static examples = ["<%= config.bin %> klaus validate", "<%= config.bin %> klaus validate --json"]
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Directory containing the project cartridges",
      default: "cartridges",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
  }

  async run(): Promise<ProjectValidation> {
    const { flags } = await this.parse(Validate)
    const result = validateProject({
      cwd: process.cwd(),
      cartridgesDir: flags["cartridges-dir"],
      cartridgePath: flags["cartridge-path"],
    })

    if (!this.jsonEnabled()) {
      ux.stdout(renderValidation(result, process.cwd(), ux.colorize))
    }
    if (!result.ok) {
      process.exitCode = 1
    }
    return result
  }
}
