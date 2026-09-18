import { Args, Command, Flags, ux } from "@oclif/core"

import { renderProjectImpact } from "../../output.js"
import { getProjectImpact, type ProjectImpact } from "../../project.js"

export default class Impact extends Command {
  static enableJsonFlag = true
  static summary = "Show which SFCC processes are affected by a project file"
  static examples = [
    "<%= config.bin %> klaus impact cartridges/app_custom/cartridge/controllers/Product.js",
    "<%= config.bin %> klaus impact cartridges/app_custom/cartridge/scripts/hooks/order.js --depth 2",
  ]
  static args = {
    file: Args.string({ description: "Project file to analyze", required: true }),
  }
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
    depth: Flags.integer({
      description: "Maximum relationship depth from the project file",
    }),
  }

  async run(): Promise<ProjectImpact> {
    const { args, flags } = await this.parse(Impact)
    if (flags.depth !== undefined && flags.depth < 0) {
      this.error("--depth must be zero or greater")
    }

    let result: ProjectImpact
    try {
      result = getProjectImpact({
        cwd: process.cwd(),
        cartridgesDir: flags["cartridges-dir"],
        cartridgePath: flags["cartridge-path"],
        depth: flags.depth,
        file: args.file,
      })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (!this.jsonEnabled()) {
      ux.stdout(renderProjectImpact(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
