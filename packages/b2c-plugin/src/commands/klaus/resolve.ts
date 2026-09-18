import {
  createSfccModuleResolver,
  resolveCandidateFile,
} from "@commerce-klaus/sfcc-module-resolver"
import { Args, Command, Flags, ux } from "@oclif/core"
import path from "node:path"

import { renderResolution } from "../../output.js"
import { resolveProjectOptions } from "../../project.js"

export type ResolveResult = {
  module: string
  resolved: string | null
  cartridgeOrder: string[]
  candidates: string[]
}

export function resolveProjectModule(options: {
  moduleName: string
  cwd: string
  cartridgesDir?: string
  cartridgePath?: string
  containingFile?: string
}): ResolveResult {
  const project = resolveProjectOptions(options)
  const cartridgeRoots = project.cartridgeRoots
  const containingFile = path.resolve(
    options.cwd,
    options.containingFile ?? path.join(project.cartridgesDirectory, ".klaus-entry.js"),
  )
  const resolved = createSfccModuleResolver(cartridgeRoots)(options.moduleName, containingFile)
  const candidates = options.moduleName.startsWith("*/")
    ? cartridgeRoots
        .map((root) =>
          resolveCandidateFile(path.join(root, options.moduleName.slice(2)), options.moduleName),
        )
        .filter((candidate): candidate is string => candidate !== undefined)
    : resolved
      ? [resolved]
      : []

  return {
    module: options.moduleName,
    resolved: resolved ?? null,
    cartridgeOrder: cartridgeRoots,
    candidates,
  }
}

export default class Resolve extends Command {
  static enableJsonFlag = true
  static summary = "Resolve an SFCC module"
  static examples = [
    "<%= config.bin %> klaus resolve '*/cartridge/scripts/example'",
    "<%= config.bin %> klaus resolve '~/cartridge/scripts/example' --from cartridges/app_custom/cartridge/controllers/Home.js",
  ]
  static args = {
    module: Args.string({ description: "SFCC module specifier", required: true }),
  }
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
    from: Flags.string({ description: "Importing cartridge file, required for ~/ modules" }),
  }

  async run(): Promise<ResolveResult> {
    const { args, flags } = await this.parse(Resolve)
    const result = resolveProjectModule({
      moduleName: args.module,
      cwd: process.cwd(),
      cartridgesDir: flags["cartridges-dir"],
      cartridgePath: flags["cartridge-path"],
      containingFile: flags.from,
    })

    if (!this.jsonEnabled()) {
      ux.stdout(renderResolution(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
