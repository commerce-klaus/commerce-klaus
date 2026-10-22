import type { CartridgeOrderTrace } from "@commerce-klaus/sfcc-module-resolver/resolution"

import {
  explainHookResolution,
  type HookResolutionTrace,
} from "@commerce-klaus/sfcc-module-resolver/hooks"
import { Args, Command, Flags, ux } from "@oclif/core"

import { renderHookResolutionTrace } from "../../../output.js"
import { resolveProjectOptions } from "../../../project.js"

export type ExplainHookResult = HookResolutionTrace & {
  cartridgeOrderTrace: CartridgeOrderTrace
}

export function explainProjectHook(options: {
  hookName: string
  cwd: string
  cartridgesDir?: string
  cartridgePath?: string
}): ExplainHookResult {
  const project = resolveProjectOptions(options)

  return {
    ...explainHookResolution(options.hookName, project.cartridgeRoots),
    cartridgeOrderTrace: project.cartridgeOrderTrace,
  }
}

export default class ExplainHook extends Command {
  static enableJsonFlag = true
  static summary = "Show how Commerce Klaus resolves an SFCC hook registration"
  static examples = ["<%= config.bin %> klaus explain hook app.payment.authorize"]
  static args = {
    hook: Args.string({ description: "Hook extension point", required: true }),
  }
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
  }

  async run(): Promise<ExplainHookResult> {
    const { args, flags } = await this.parse(ExplainHook)
    let result: ExplainHookResult
    try {
      result = explainProjectHook({
        hookName: args.hook,
        cwd: process.cwd(),
        cartridgesDir: flags["cartridges-dir"],
        cartridgePath: flags["cartridge-path"],
      })
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (!this.jsonEnabled()) {
      ux.stdout(renderHookResolutionTrace(result, process.cwd(), ux.colorize))
    }

    return result
  }
}
