import { Command, Flags, ux } from "@oclif/core"

import { renderDoctor } from "../../output.js"
import { diagnoseProject, type DoctorResult } from "../../project.js"

export default class Doctor extends Command {
  static enableJsonFlag = true
  static summary = "Diagnose the local SFCC project configuration"
  static examples = ["<%= config.bin %> klaus doctor", "<%= config.bin %> klaus doctor --json"]
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
  }

  async run(): Promise<DoctorResult> {
    const { flags } = await this.parse(Doctor)
    const result = diagnoseProject({
      cwd: process.cwd(),
      cartridgesDir: flags["cartridges-dir"],
      cartridgePath: flags["cartridge-path"],
    })

    if (!this.jsonEnabled()) {
      ux.stdout(renderDoctor(result, process.cwd(), ux.colorize))
    }

    if (!result.ok) {
      process.exitCode = 1
    }
    return result
  }
}
