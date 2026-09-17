import path from "node:path"

import type { SyncTypesResult } from "./sync-types.ts"

import { resolveSiteTemplatePath } from "./shared.ts"

export type SyncTypesOutputStyle = "dim" | "green" | "yellow"
export type SyncTypesColorize = (style: SyncTypesOutputStyle, text: string) => string

export function renderSyncTypesResult(
  result: SyncTypesResult,
  currentDirectory: string,
  siteTemplatePath: string | undefined,
  writeStdout: (text: string) => void,
  colorize: SyncTypesColorize = (_style, text) => text,
): void {
  const scriptTypesState = colorize(
    "green",
    result.scriptTypes.refreshed ? "refreshed" : "up to date",
  )
  const scriptTypesVersion = result.scriptTypes.version
    ? colorize("dim", ` (version ${result.scriptTypes.version})`)
    : ""
  writeStdout(`Script API types: ${scriptTypesState}${scriptTypesVersion}\n`)

  const customAttributes = result.customAttributes
  if (customAttributes.written) {
    writeStdout(
      `Custom attributes: ${colorize("green", `${formatCount(customAttributes.attributesCount, "attribute")} in ${formatCount(customAttributes.declarationsCount, "declaration")}`)} -> ${colorize("dim", displayPath(customAttributes.outputFilePath, currentDirectory))}\n`,
    )
  } else {
    const metadataDirectory = path.join(
      resolveSiteTemplatePath(currentDirectory, siteTemplatePath),
      "meta",
    )
    writeStdout(
      `Custom attributes: ${colorize("yellow", "no metadata found")} under ${colorize("dim", `${displayPath(metadataDirectory, currentDirectory)}/*.xml`)}\n`,
    )
  }

  writeStdout(
    `Hooks: ${colorize("green", formatCount(result.hooks.declarationsCount, "declaration"))} -> ${colorize("dim", displayPath(result.hooks.outputFilePath, currentDirectory))}\n`,
  )

  if (result.customApis.written) {
    writeStdout(
      `Custom APIs: ${colorize("green", `${formatCount(result.customApis.schemasCount, "schema", "schemas")}, ${formatCount(result.customApis.operationsCount, "operation")}`)} -> ${colorize("dim", displayPath(result.customApis.outputFilePath, currentDirectory))}\n`,
    )
  } else {
    writeStdout(`Custom APIs: ${colorize("yellow", "no contracts found")}\n`)
  }

  if (result.jobSteps.written) {
    writeStdout(
      `Job steps: ${colorize("green", formatCount(result.jobSteps.declarationsCount, "declaration"))} -> ${colorize("dim", displayPath(result.jobSteps.outputFilePath, currentDirectory))}\n`,
    )
  } else {
    writeStdout(`Job steps: ${colorize("yellow", "no definitions found")}\n`)
  }
}

function displayPath(filePath: string, currentDirectory: string): string {
  return path.relative(currentDirectory, filePath).replaceAll(path.sep, "/") || "."
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
