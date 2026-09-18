import { Command, Flags, ux } from "@oclif/core"
import { watch } from "chokidar"
import path from "node:path"

import { renderValidation, renderValidationSarif } from "../../output.js"
import { validateProject, type ProjectOptions, type ProjectValidation } from "../../project.js"

export default class Validate extends Command {
  static enableJsonFlag = true
  static summary = "Validate SFCC project contracts"
  static examples = [
    "<%= config.bin %> klaus validate",
    "<%= config.bin %> klaus validate --watch",
    "<%= config.bin %> klaus validate --format sarif > sfcc-validation.sarif",
    "<%= config.bin %> klaus validate --json",
  ]
  static flags = {
    "cartridges-dir": Flags.string({
      description: "Override the project cartridges directory",
    }),
    "cartridge-path": Flags.string({
      description: "Colon-separated cartridge path in precedence order",
    }),
    format: Flags.string({
      description: "Human-readable text or SARIF 2.1.0 output",
      options: ["sarif", "text"],
      default: "text",
    }),
    watch: Flags.boolean({
      char: "w",
      description: "Revalidate when cartridge scripts or metadata change",
    }),
  }

  async run(): Promise<ProjectValidation> {
    const { flags } = await this.parse(Validate)
    if (flags.watch && this.jsonEnabled()) {
      this.error("--watch cannot be combined with --json")
    }
    if (flags.watch && flags.format === "sarif") {
      this.error("--watch cannot be combined with --format sarif")
    }
    if (this.jsonEnabled() && flags.format === "sarif") {
      this.error("--format sarif cannot be combined with --json")
    }

    const options = {
      cwd: process.cwd(),
      cartridgesDir: flags["cartridges-dir"],
      cartridgePath: flags["cartridge-path"],
    }
    let result = this.validate(options)

    this.report(result, flags.format)
    if (!flags.watch) {
      return result
    }

    ux.stdout(
      `${ux.colorize("yellow", "WATCH")}: Waiting for SFCC contract changes in ${ux.colorize("dim", result.cartridgesDirectory)}.`,
    )
    await this.watchForChanges(result.cartridgesDirectory, () => {
      result = this.validate(options)
      ux.stdout("")
      this.report(result, flags.format)
    })

    return result
  }

  protected validate(options: ProjectOptions): ProjectValidation {
    return validateProject(options)
  }

  protected async watchForChanges(directory: string, onChange: () => void): Promise<void> {
    const watcher = watch(directory, { ignoreInitial: true })
    let timer: ReturnType<typeof setTimeout> | undefined

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        if (timer) {
          clearTimeout(timer)
        }
        process.removeListener("SIGINT", stop)
        process.removeListener("SIGTERM", stop)
      }
      const fail = (error: unknown) => {
        cleanup()
        void watcher.close().finally(() => reject(error))
      }
      const stop = () => {
        cleanup()
        void watcher.close().then(resolve, reject)
      }

      watcher.on("all", (_event, filePath) => {
        if (!isValidationInput(filePath)) {
          return
        }
        if (timer) {
          clearTimeout(timer)
        }
        timer = setTimeout(() => {
          try {
            onChange()
          } catch (error) {
            fail(error)
          }
        }, 100)
      })
      watcher.on("error", fail)
      process.once("SIGINT", stop)
      process.once("SIGTERM", stop)
    })
  }

  private report(result: ProjectValidation, format: string): void {
    if (!this.jsonEnabled()) {
      ux.stdout(
        format === "sarif"
          ? renderValidationSarif(result, process.cwd())
          : renderValidation(result, process.cwd(), ux.colorize),
      )
    }
    process.exitCode = result.ok ? undefined : 1
  }
}

function isValidationInput(filePath: string): boolean {
  return new Set([".ds", ".js", ".json", ".yaml", ".yml"]).has(path.extname(filePath))
}
