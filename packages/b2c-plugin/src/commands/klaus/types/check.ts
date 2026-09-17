import { TypecheckCommand } from "@commerce-klaus/typescript-sfcc/commands"

export default class Typecheck extends TypecheckCommand {
  static usage = undefined
  static examples = [
    "<%= config.bin %> klaus types check",
    "<%= config.bin %> klaus types check --project cartridges/jsconfig.json",
  ]
}
