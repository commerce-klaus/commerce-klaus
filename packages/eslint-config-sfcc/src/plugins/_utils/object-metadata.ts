import {
  readSfccObjectMetadata,
  type SfccObjectMetadata,
} from "@commerce-klaus/sfcc-module-resolver/object-metadata"
import {
  DEFAULT_SITE_TEMPLATE_PATH,
  resolveSiteTemplatePath,
} from "@commerce-klaus/sfcc-module-resolver/resolution"
import fs from "node:fs"
import path from "node:path"

import type { SfccSettings } from "../../types/sfcc-settings.js"

interface MetadataCacheEntry {
  signature: string
  metadata: SfccObjectMetadata
}

const metadataCache = new Map<string, MetadataCacheEntry>()
const EMPTY_METADATA: SfccObjectMetadata = { sourceFiles: [], objectTypes: [] }

export function getSfccObjectMetadata(settings: SfccSettings, cwd: string): SfccObjectMetadata {
  const siteTemplatePath = resolveSiteTemplatePath(
    settings.siteTemplatePath,
    cwd,
    DEFAULT_SITE_TEMPLATE_PATH,
  )
  if (!siteTemplatePath) {
    return EMPTY_METADATA
  }

  const metaDirectory = path.join(siteTemplatePath, "meta")
  if (!fs.existsSync(metaDirectory)) {
    return EMPTY_METADATA
  }

  const sourceFiles = fs
    .readdirSync(metaDirectory)
    .filter((fileName) => fileName.endsWith(".xml"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => path.join(metaDirectory, fileName))
    .filter((filePath) => !fs.statSync(filePath).isDirectory())
  const signature = sourceFiles
    .map((filePath) => {
      const stat = fs.statSync(filePath)
      return `${filePath}:${stat.mtimeMs}:${stat.size}`
    })
    .join("|")
  const cached = metadataCache.get(metaDirectory)
  if (cached?.signature === signature) {
    return cached.metadata
  }

  const metadata = readSfccObjectMetadata({
    cwd,
    siteTemplatePath: settings.siteTemplatePath,
  })
  metadataCache.set(metaDirectory, { signature, metadata })
  return metadata
}
