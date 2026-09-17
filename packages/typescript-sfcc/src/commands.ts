import { Command, CommandHelp, Flags, loadHelpClass, ux } from "@oclif/core"
import { spawnSync } from "node:child_process"
import path from "node:path"

import { renderSyncTypesResult } from "./sync-types-output.ts"
import { SyncTypesExecutionError, syncTypes, type SyncTypesResult } from "./sync-types.ts"
import { parseArguments } from "./typecheck-cartridges.ts"
import { formatDiagnostics, typecheckSolutionProjects } from "./typecheck.ts"

export interface TypecheckCommandResult {
  success: true
  project: string
  cartridgesDirectory: string
}

abstract class CommerceKlausCommand extends Command {
  protected toErrorJson(error: unknown): { error: { exitCode: number; message: string } } {
    const exitCode =
      typeof error === "object" && error !== null && "exitCode" in error
        ? Number(error.exitCode)
        : 1
    return {
      error: {
        exitCode: Number.isFinite(exitCode) ? exitCode : 1,
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }

  protected async showCommandHelp(): Promise<never> {
    if (this.ctor.usage !== undefined) {
      const help = new CommandHelp(this.ctor as unknown as Command.Loadable, this.config, {
        maxWidth: process.stdout.columns ?? 80,
      })
        .generate()
        .replaceAll(`${this.config.bin} ${this.ctor.id}`, this.config.bin)
      ux.stdout(help)
      return this.exit(0)
    }

    const Help = await loadHelpClass(this.config)
    await new Help(this.config, {}).showCommandHelp(this.ctor as unknown as Command.Loadable, [])
    return this.exit(0)
  }
}

export class TypecheckCommand extends CommerceKlausCommand {
  static description = "Typecheck SFCC cartridges with Commerce Klaus module resolution"
  static enableJsonFlag = true
  static examples = ["<%= config.bin %>", "<%= config.bin %> --project cartridges/jsconfig.json"]
  static usage: string | string[] | undefined = "[flags]"
  static flags = {
    help: Flags.boolean({ char: "h", description: "Show CLI help." }),
    project: Flags.string({
      char: "p",
      description: "Path to the solution jsconfig.json or tsconfig.json",
    }),
    "cartridges-dir": Flags.string({
      description: "Path to the cartridges directory",
    }),
    "project-directory": Flags.string({
      aliases: ["working-directory"],
      description: "Project directory",
    }),
  }

  async run(): Promise<TypecheckCommandResult> {
    const { flags } = await this.parse(TypecheckCommand)
    if (flags.help) {
      return this.showCommandHelp()
    }
    const currentDirectory = path.resolve(
      flags["project-directory"] ?? process.env.SFCC_WORKING_DIRECTORY ?? process.cwd(),
    )
    const args = [
      ...(flags.project ? ["--project", flags.project] : []),
      ...(flags["cartridges-dir"] ? ["--cartridges-dir", flags["cartridges-dir"]] : []),
    ]
    const { solutionConfigPath, cartridgesDir } = parseArguments(args, currentDirectory)

    if (!this.jsonEnabled()) {
      ux.stdout(`Checking SFCC cartridge types in ${ux.colorize("dim", solutionConfigPath)}`)
    }

    try {
      const diagnostics = typecheckSolutionProjects({ solutionConfigPath, cartridgesDir })
      const formattedDiagnostics = formatDiagnostics(diagnostics, currentDirectory).trimEnd()

      if (diagnostics.length > 0) {
        if (!this.jsonEnabled() && formattedDiagnostics) {
          ux.stdout(formattedDiagnostics)
        }
        this.error(
          this.jsonEnabled() ? formattedDiagnostics || "Typecheck failed." : "Typecheck failed.",
          { exit: 2 },
        )
      }
    } catch (error) {
      this.error(error instanceof Error ? error : String(error))
    }

    if (!this.jsonEnabled()) {
      ux.stdout(`${ux.colorize("green", "PASS")}: No type errors found.`)
    }

    return {
      success: true,
      project: solutionConfigPath,
      cartridgesDirectory: cartridgesDir ?? path.dirname(solutionConfigPath),
    }
  }
}

export interface SyncTypesCommandResult {
  success: true
  projectDirectory: string
  salesforce?: unknown
  types: SyncTypesResult
}

interface B2cInvocation {
  command: string
  args: string[]
}

export class SyncTypesCommand extends CommerceKlausCommand {
  static description = "Synchronize Salesforce and project-specific SFCC types"
  static enableJsonFlag = true
  static examples = ["<%= config.bin %>", "<%= config.bin %> --force --min-version 26.7.0"]
  static usage: string | string[] | undefined = "[flags]"
  static flags = {
    help: Flags.boolean({ char: "h", description: "Show CLI help." }),
    force: Flags.boolean({
      description: "Refresh Salesforce Script API types even when they are already present",
    }),
    "min-version": Flags.string({
      description: "Minimum accepted Salesforce Script API types version",
    }),
    output: Flags.string({
      description: "Output path for the generated Salesforce jsconfig.json",
    }),
    "site-template-path": Flags.string({
      description: "Path to the site template used for metadata type generation",
    }),
    "project-directory": Flags.string({
      aliases: ["working-directory"],
      description: "Project directory",
    }),
  }

  protected prepareB2cInvocation(
    command: string,
    args: string[],
    _currentDirectory: string,
  ): B2cInvocation {
    return { command, args }
  }

  async run(): Promise<SyncTypesCommandResult> {
    const { flags } = await this.parse(SyncTypesCommand)
    if (flags.help) {
      return this.showCommandHelp()
    }
    const currentDirectory = path.resolve(
      flags["project-directory"] ?? process.env.SFCC_WORKING_DIRECTORY ?? process.cwd(),
    )
    const jsonEnabled = this.jsonEnabled()
    let commandError = ""
    let salesforceResult: unknown

    if (!jsonEnabled) {
      ux.stdout(`Synchronizing SFCC types in ${ux.colorize("dim", currentDirectory)}`)
    }

    let result: SyncTypesResult
    try {
      result = syncTypes({
        currentDirectory,
        force: flags.force,
        minimumVersion: flags["min-version"],
        outputPath: flags.output,
        siteTemplatePath: flags["site-template-path"],
        spawnSync: (command, args, options) => {
          const invocation = this.prepareB2cInvocation(command, args, currentDirectory)
          if (!jsonEnabled) {
            return spawnSync(invocation.command, invocation.args, options)
          }

          const commandResult = spawnSync(invocation.command, [...invocation.args, "--json"], {
            ...options,
            encoding: "utf8",
            stdio: "pipe",
          })
          if (typeof commandResult.stderr === "string") {
            commandError += commandResult.stderr
          }
          if (typeof commandResult.stdout === "string" && commandResult.stdout) {
            try {
              salesforceResult = JSON.parse(commandResult.stdout)
            } catch {
              salesforceResult = commandResult.stdout.trimEnd()
            }
          }

          return commandResult
        },
      })
    } catch (error) {
      const exitCode = error instanceof SyncTypesExecutionError ? error.exitCode : 1
      const message =
        commandError.trimEnd() || (error instanceof Error ? error.message : String(error))
      this.error(message, { exit: exitCode })
    }

    if (!jsonEnabled) {
      renderSyncTypesResult(
        result,
        currentDirectory,
        flags["site-template-path"],
        (text) => ux.stdout(text.trimEnd()),
        ux.colorize,
      )
      ux.stdout(`${ux.colorize("green", "DONE")}: Type synchronization completed successfully.`)
    }

    return {
      success: true,
      projectDirectory: currentDirectory,
      salesforce: salesforceResult,
      types: result,
    }
  }
}
