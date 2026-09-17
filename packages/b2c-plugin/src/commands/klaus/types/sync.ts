import { SyncTypesCommand } from "@commerce-klaus/typescript-sfcc/commands"

export function createB2cCommandArgs(
  command: string,
  args: string[],
  currentDirectory: string,
): string[] {
  const b2cArgs = command === "pnpm" && args[0] === "b2c" ? args.slice(1) : args
  return [...b2cArgs, "--project-directory", currentDirectory]
}

export default class SyncTypes extends SyncTypesCommand {
  static usage = undefined
  static examples = [
    "<%= config.bin %> klaus types sync",
    "<%= config.bin %> klaus types sync --force --min-version 26.7.0",
  ]

  protected prepareB2cInvocation(command: string, args: string[], currentDirectory: string) {
    const cliPath = process.argv[1]
    if (!cliPath) {
      return { command, args }
    }
    return {
      command: process.execPath,
      args: [cliPath, ...createB2cCommandArgs(command, args, currentDirectory)],
    }
  }
}
