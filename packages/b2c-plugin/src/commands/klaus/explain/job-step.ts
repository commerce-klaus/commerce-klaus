import type { CartridgeOrderTrace } from "@commerce-klaus/sfcc-module-resolver/resolution"

import {
  explainStepTypeResolution,
  type StepTypeResolutionTrace,
} from "@commerce-klaus/sfcc-module-resolver/job-steps"
import { Args, Command, Flags, ux } from "@oclif/core"

import { renderStepTypeResolutionTrace } from "../../../output.js"
import { resolveProjectOptions } from "../../../project.js"

export type ExplainJobStepResult = StepTypeResolutionTrace & {
  cartridgeOrderTrace: CartridgeOrderTrace
}

export function explainProjectJobStep(options: {
  typeId: string
  cwd: string
  cartridgesDir?: string
  cartridgePath?: string
}): ExplainJobStepResult {
  const project = resolveProjectOptions(options)

  return {
    ...explainStepTypeResolution(options.typeId, project.cartridgeRoots),
    cartridgeOrderTrace: project.cartridgeOrderTrace,
  }
}

export default class ExplainJobStep extends Command {
  static enableJsonFlag = true
  static summary = "Show how Commerce Klaus resolves an SFCC job step definition"
  static examples = ["<%= config.bin %> klaus explain job-step custom.ExportProducts"]
  static args = {
    type: Args.string({ description: "Job step type ID", required: true }),
  }
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
  }

  async run(): Promise<ExplainJobStepResult> {
    const { args, flags } = await this.parse(ExplainJobStep)
    let result: ExplainJobStepResult
    try {
      result = explainProjectJobStep({
        typeId: args.type,
        cwd: process.cwd(),
        cartridgesDir: flags["cartridges-dir"],
        cartridgePath: flags["cartridge-path"],
      })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (!this.jsonEnabled()) {
      ux.stdout(renderStepTypeResolutionTrace(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
