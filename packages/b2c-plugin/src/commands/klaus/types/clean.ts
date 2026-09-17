import { CleanTypesCommand } from "@commerce-klaus/typescript-sfcc/commands"

export default class CleanTypes extends CleanTypesCommand {
  static usage = undefined
  static examples = [
    "<%= config.bin %> klaus types clean",
    "<%= config.bin %> klaus types clean --dry-run",
  ]
}
