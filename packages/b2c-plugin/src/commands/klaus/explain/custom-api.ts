import type { CartridgeOrderTrace } from "@commerce-klaus/sfcc-module-resolver/resolution"

import {
  explainCustomApiResolution,
  type CustomApiResolutionTrace,
} from "@commerce-klaus/sfcc-module-resolver/custom-apis"
import { Args, Command, Flags, ux } from "@oclif/core"

import { renderCustomApiResolutionTrace } from "../../../output.js"
import { resolveProjectOptions } from "../../../project.js"

export type ExplainCustomApiResult = CustomApiResolutionTrace & {
  cartridgeOrderTrace: CartridgeOrderTrace
}

export function explainProjectCustomApi(options: {
  apiId: string
  operationId: string
  cwd: string
  cartridgesDir?: string
  cartridgePath?: string
}): ExplainCustomApiResult {
  const project = resolveProjectOptions(options)

  return {
    ...explainCustomApiResolution(options.apiId, options.operationId, project.cartridgeRoots),
    cartridgeOrderTrace: project.cartridgeOrderTrace,
  }
}

export default class ExplainCustomApi extends Command {
  static enableJsonFlag = true
  static summary = "Show how Commerce Klaus resolves an SFCC Custom API operation"
  static examples = ["<%= config.bin %> klaus explain custom-api basket-preparation prepareBasket"]
  static args = {
    api: Args.string({ description: "Custom API ID", required: true }),
    operation: Args.string({ description: "Custom API operation ID", required: true }),
  }
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
  }

  async run(): Promise<ExplainCustomApiResult> {
    const { args, flags } = await this.parse(ExplainCustomApi)
    let result: ExplainCustomApiResult
    try {
      result = explainProjectCustomApi({
        apiId: args.api,
        operationId: args.operation,
        cwd: process.cwd(),
        cartridgesDir: flags["cartridges-dir"],
        cartridgePath: flags["cartridge-path"],
      })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (!this.jsonEnabled()) {
      ux.stdout(renderCustomApiResolutionTrace(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
