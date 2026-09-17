import {
  explainSfccModuleResolution,
  resolveCartridgeRoots,
  type SfccModuleResolutionTrace,
} from "@commerce-klaus/sfcc-module-resolver"
import { Args, Command, Flags, ux } from "@oclif/core"
import path from "node:path"

import { renderResolutionTrace } from "../../output.js"

export type ExplainResult = SfccModuleResolutionTrace & {
  cartridgeOrder: string[]
  containingFile: string
}

export function explainProjectModule(options: {
  moduleName: string
  cwd: string
  cartridgesDir: string
  cartridgePath?: string
  containingFile?: string
}): ExplainResult {
  if (
    (options.moduleName.startsWith("~/") || options.moduleName === "module.superModule") &&
    !options.containingFile
  ) {
    throw new Error(`--from is required for ${options.moduleName}`)
  }

  const containingFile = path.resolve(
    options.cwd,
    options.containingFile ?? path.join(options.cartridgesDir, ".klaus-entry.js"),
  )
  const cartridgeOrder = resolveCartridgeRoots({
    basePath: options.cartridgesDir,
    cwd: options.cwd,
    cartridgePath: options.cartridgePath?.split(":"),
    containingFile,
  })

  return {
    ...explainSfccModuleResolution(options.moduleName, containingFile, cartridgeOrder),
    cartridgeOrder,
    containingFile,
  }
}

export default class Explain extends Command {
  static enableJsonFlag = true
  static summary = "Show how Commerce Klaus resolves an SFCC module"
  static examples = [
    "<%= config.bin %> klaus explain '*/cartridge/scripts/example'",
    "<%= config.bin %> klaus explain module.superModule --from cartridges/app_custom/cartridge/controllers/Page.js",
  ]
  static args = {
    module: Args.string({ description: "SFCC module specifier", required: true }),
  }
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Directory containing the project cartridges",
      default: "cartridges",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
    from: Flags.string({
      description: "Importing cartridge file, required for ~/ and module.superModule",
    }),
  }

  async run(): Promise<ExplainResult> {
    const { args, flags } = await this.parse(Explain)
    let result: ExplainResult
    try {
      result = explainProjectModule({
        moduleName: args.module,
        cwd: process.cwd(),
        cartridgesDir: flags["cartridges-dir"],
        cartridgePath: flags["cartridge-path"],
        containingFile: flags.from,
      })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (!this.jsonEnabled()) {
      ux.stdout(renderResolutionTrace(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
