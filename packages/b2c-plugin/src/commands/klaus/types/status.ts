import { TypesStatusCommand } from "@commerce-klaus/typescript-sfcc/commands"

export default class TypesStatus extends TypesStatusCommand {
  static usage = undefined
  static examples = [
    "<%= config.bin %> klaus types status",
    "<%= config.bin %> klaus types status --min-version 26.7.0",
  ]
}
