import { XMLParser } from "fast-xml-parser"
import {
  existsSync as nodeExistsSync,
  readdirSync as nodeReaddirSync,
  readFileSync as nodeReadFileSync,
  statSync as nodeStatSync,
} from "node:fs"
import path from "node:path"

import {
  DEFAULT_SITE_TEMPLATE_PATH,
  resolveSiteTemplatePath,
} from "./resolution/cartridge-order.ts"

export type SfccObjectTypeKind = "custom" | "system"
export type SfccAttributeEmptySemantics = "length" | "nullish-only"

export interface SfccAttributeDefinition {
  id: string
  type: string
  mandatory: boolean
  selectMultiple: boolean
  values: string[]
  displayName?: string
  description?: string
}

export interface SfccObjectTypeDefinition {
  kind: SfccObjectTypeKind
  typeId: string
  attributes: SfccAttributeDefinition[]
  sourceFile: string
  displayName?: string
  description?: string
}

export interface SfccObjectMetadata {
  sourceFiles: string[]
  objectTypes: SfccObjectTypeDefinition[]
}

export interface ReadSfccObjectMetadataOptions {
  cwd?: string
  siteTemplatePath?: string
  existsSync?: (filePath: string) => boolean
  readFileSync?: (filePath: string, encoding: BufferEncoding) => string
  readdirSync?: (dirPath: string) => string[]
  statSync?: (filePath: string) => { isDirectory(): boolean }
}

interface ParsedAttributeDefinition {
  [key: string]: unknown
}

interface ParsedTypeDefinition {
  "type-id"?: unknown
  "display-name"?: unknown
  description?: unknown
  "custom-attribute-definitions"?: {
    "attribute-definition"?: ParsedAttributeDefinition | ParsedAttributeDefinition[]
  }
  "attribute-definitions"?: {
    "attribute-definition"?: ParsedAttributeDefinition | ParsedAttributeDefinition[]
  }
}

interface ParsedMetadataRoot {
  metadata?: {
    "type-extension"?: ParsedTypeDefinition | ParsedTypeDefinition[]
    "custom-type"?: ParsedTypeDefinition | ParsedTypeDefinition[]
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
})

const LENGTH_ATTRIBUTE_TYPES = new Set(["email", "password", "string", "text", "url"])

export function readSfccObjectMetadata(
  options: ReadSfccObjectMetadataOptions = {},
): SfccObjectMetadata {
  const cwd = options.cwd ?? process.cwd()
  const existsSync = options.existsSync ?? nodeExistsSync
  const readFileSync = options.readFileSync ?? nodeReadFileSync
  const readdirSync = options.readdirSync ?? nodeReaddirSync
  const statSync = options.statSync ?? nodeStatSync
  const siteTemplatePath = resolveSiteTemplatePath(
    options.siteTemplatePath,
    cwd,
    DEFAULT_SITE_TEMPLATE_PATH,
  )
  const metaDirectory = siteTemplatePath ? path.join(siteTemplatePath, "meta") : undefined

  if (!metaDirectory || !existsSync(metaDirectory)) {
    return { sourceFiles: [], objectTypes: [] }
  }

  const sourceFiles = readdirSync(metaDirectory)
    .filter((fileName) => fileName.endsWith(".xml"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => path.join(metaDirectory, fileName))
    .filter((filePath) => !statSync(filePath).isDirectory())
  const objectTypes: SfccObjectTypeDefinition[] = []

  for (const sourceFile of sourceFiles) {
    const parsed = parser.parse(readFileSync(sourceFile, "utf8")) as ParsedMetadataRoot
    const metadata = parsed.metadata
    if (!metadata) {
      continue
    }

    for (const extension of toArray(metadata["type-extension"])) {
      const definition = normalizeObjectType(extension, "system", sourceFile)
      if (definition) {
        objectTypes.push(definition)
      }
    }

    for (const customType of toArray(metadata["custom-type"])) {
      const definition = normalizeObjectType(customType, "custom", sourceFile)
      if (definition) {
        objectTypes.push(definition)
      }
    }
  }

  return { sourceFiles, objectTypes }
}

export function findSfccAttributeDefinition(
  metadata: SfccObjectMetadata,
  objectTypeId: string,
  attributeId: string,
): SfccAttributeDefinition | undefined {
  const definitions = metadata.objectTypes
    .filter((objectType) => objectType.typeId === objectTypeId)
    .flatMap((objectType) =>
      objectType.attributes.filter((attribute) => attribute.id === attributeId),
    )
  if (definitions.length === 0) {
    return undefined
  }

  const signatures = new Set(
    definitions.map(
      (definition) => `${definition.type}:${definition.selectMultiple ? "multiple" : "single"}`,
    ),
  )
  return signatures.size === 1 ? definitions.at(-1) : undefined
}

export function getSfccAttributeEmptySemantics(
  definition: SfccAttributeDefinition,
): SfccAttributeEmptySemantics | undefined {
  if (definition.selectMultiple || definition.type.startsWith("set-of-")) {
    return "length"
  }

  if (definition.type.startsWith("enum-of-")) {
    return "nullish-only"
  }

  if (LENGTH_ATTRIBUTE_TYPES.has(definition.type)) {
    return "length"
  }

  if (
    [
      "boolean",
      "date",
      "datetime",
      "double",
      "html",
      "int",
      "integer",
      "long",
      "number",
      "quantity",
    ].includes(definition.type)
  ) {
    return "nullish-only"
  }

  return undefined
}

function normalizeObjectType(
  source: ParsedTypeDefinition,
  kind: SfccObjectTypeKind,
  sourceFile: string,
): SfccObjectTypeDefinition | undefined {
  const typeId = asString(source["type-id"])
  if (!typeId) {
    return undefined
  }

  const definitions =
    kind === "system" ? source["custom-attribute-definitions"] : source["attribute-definitions"]
  const documentation = extractDocumentation(source)

  return {
    kind,
    typeId,
    sourceFile,
    attributes: toArray(definitions?.["attribute-definition"])
      .map(normalizeAttribute)
      .filter((attribute): attribute is SfccAttributeDefinition => attribute !== undefined),
    ...documentation,
  }
}

function normalizeAttribute(
  source: ParsedAttributeDefinition,
): SfccAttributeDefinition | undefined {
  const id = asString(source["attribute-id"])
  if (!id) {
    return undefined
  }

  const type = asString(source.type)?.toLowerCase() ?? "unknown"
  const valueDefinitions = source["value-definitions"]
  const values = isRecord(valueDefinitions)
    ? toArray(
        valueDefinitions["value-definition"] as
          | { value?: unknown }
          | { value?: unknown }[]
          | undefined,
      )
        .map((definition) => asString(definition.value))
        .filter((value): value is string => value !== undefined)
    : []

  return {
    id,
    type,
    mandatory: asString(source["mandatory-flag"]) === "true",
    selectMultiple: asString(source["select-multiple-flag"]) === "true",
    values: [...new Set(values)],
    ...extractDocumentation(source),
  }
}

function extractDocumentation(source: unknown): {
  displayName?: string
  description?: string
} {
  if (!isRecord(source)) {
    return {}
  }

  return {
    displayName: extractXDefaultText(source["display-name"]),
    description: extractXDefaultText(source.description),
  }
}

function extractXDefaultText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    const defaultEntry = value.find(
      (item) =>
        isRecord(item) && (asString(item["xml:lang"]) ?? asString(item.lang)) === "x-default",
    )
    return extractXDefaultText(defaultEntry ?? value[0])
  }

  if (!isRecord(value)) {
    return undefined
  }

  const language = asString(value["xml:lang"]) ?? asString(value.lang)
  if (language && language !== "x-default") {
    return undefined
  }

  return asString(value["#text"])
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}
