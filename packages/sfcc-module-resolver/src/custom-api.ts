import fs from "node:fs"
import path from "node:path"
import { parse as parseYaml } from "yaml"

export interface OasSchema {
  $ref?: string
  type?: string
  properties?: Record<string, OasSchema>
  required?: string[]
  items?: OasSchema
  enum?: unknown[]
  nullable?: boolean
  description?: string
  additionalProperties?: boolean | OasSchema
}

export interface OasParameter {
  $ref?: string
  name?: string
  in?: string
  required?: boolean
  schema?: OasSchema
}

export interface OasMediaType {
  schema?: OasSchema
}

export interface OasRequestBody {
  $ref?: string
  required?: boolean
  content?: Record<string, OasMediaType>
}

export interface OasResponse {
  $ref?: string
  content?: Record<string, OasMediaType>
}

export interface OasOperation {
  operationId?: string
  parameters?: OasParameter[]
  requestBody?: OasRequestBody
  responses?: Record<string, OasResponse>
}

export interface OasPathItem {
  parameters?: OasParameter[]
  get?: OasOperation
  post?: OasOperation
  put?: OasOperation
  patch?: OasOperation
  delete?: OasOperation
  head?: OasOperation
  options?: OasOperation
}

export interface OasDocument {
  components?: {
    schemas?: Record<string, OasSchema>
    parameters?: Record<string, OasParameter>
    requestBodies?: Record<string, OasRequestBody>
    responses?: Record<string, OasResponse>
  }
  paths?: Record<string, OasPathItem>
}

export interface ApiJsonEndpoint {
  endpoint?: string
  schema?: string
  implementation?: string
}

export interface ApiJsonFile {
  endpoints?: ApiJsonEndpoint[]
}

export interface CustomApiOperationMatch {
  pathItem: OasPathItem
  operation: OasOperation
}

export interface CustomApiDefinition {
  apiJsonPath: string
  endpoint: string
  schemaPath: string
  document: OasDocument
  operation?: CustomApiOperationMatch
}

export interface RequiredCustomApiExport {
  operationId: string
  schemaPath: string
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const
const SUCCESS_STATUS_PRIORITY = ["200", "201", "202", "204"]
const CUSTOM_API_SCRIPT_EXTENSIONS = [".js", ".cjs", ".mjs", ".ds"]

export function findApiJsonFiles(cartridgesDir: string): string[] {
  const results: string[] = []
  const queue = [cartridgesDir]

  while (queue.length > 0) {
    const currentDir = queue.shift()
    if (!currentDir) {
      continue
    }

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        queue.push(fullPath)
        continue
      }

      if (entry.name === "api.json") {
        results.push(fullPath)
      }
    }
  }

  return results
}

export function loadOasDocument(schemaPath: string): OasDocument | undefined {
  if (!fs.existsSync(schemaPath)) {
    return undefined
  }

  return parseYaml(fs.readFileSync(schemaPath, "utf8")) as OasDocument
}

export function findOperationByOperationId(
  document: OasDocument,
  operationId: string,
): CustomApiOperationMatch | undefined {
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (operation?.operationId === operationId) {
        return { pathItem, operation }
      }
    }
  }

  return undefined
}

export function resolveOasRef(ref: string, document: OasDocument): unknown {
  const segments = ref
    .replace(/^#\//u, "")
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))

  let current: unknown = document
  for (const segment of segments) {
    if (typeof current !== "object" || current === null) {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

export function resolveOasParameter(
  parameter: OasParameter,
  document: OasDocument,
): OasParameter | undefined {
  if (!parameter.$ref) {
    return parameter
  }

  return resolveOasRef(parameter.$ref, document) as OasParameter | undefined
}

export function resolveOasRequestBody(
  requestBody: OasRequestBody | undefined,
  document: OasDocument,
): OasRequestBody | undefined {
  if (!requestBody) {
    return undefined
  }

  if (!requestBody.$ref) {
    return requestBody
  }

  return resolveOasRef(requestBody.$ref, document) as OasRequestBody | undefined
}

// The platform rejects Custom API request bodies whose schema (at any nesting level) declares `additionalProperties`.
export function schemaContainsAdditionalProperties(
  schema: OasSchema | undefined,
  document: OasDocument,
  seenRefs = new Set<string>(),
): boolean {
  if (!schema) {
    return false
  }

  if (schema.$ref) {
    if (seenRefs.has(schema.$ref)) {
      return false
    }

    seenRefs.add(schema.$ref)
    return schemaContainsAdditionalProperties(
      resolveOasRef(schema.$ref, document) as OasSchema | undefined,
      document,
      seenRefs,
    )
  }

  if (schema.additionalProperties !== undefined) {
    return true
  }

  if (schemaContainsAdditionalProperties(schema.items, document, seenRefs)) {
    return true
  }

  return Object.values(schema.properties ?? {}).some((propertySchema) =>
    schemaContainsAdditionalProperties(propertySchema, document, seenRefs),
  )
}

export function findSuccessOasResponse(
  responses: Record<string, OasResponse> | undefined,
  document: OasDocument,
): OasResponse | undefined {
  if (!responses) {
    return undefined
  }

  const statusCode =
    SUCCESS_STATUS_PRIORITY.find((code) => responses[code]) ??
    Object.keys(responses).find((code) => code.startsWith("2"))
  if (!statusCode) {
    return undefined
  }

  const response = responses[statusCode]
  if (!response.$ref) {
    return response
  }

  return resolveOasRef(response.$ref, document) as OasResponse | undefined
}

export function resolveCustomApiScriptPath(
  directory: string,
  scriptName: string,
): string | undefined {
  const requestedPath = path.resolve(directory, scriptName)
  const candidates = [
    requestedPath,
    ...CUSTOM_API_SCRIPT_EXTENSIONS.map((extension) => `${requestedPath}${extension}`),
  ]

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile()
    } catch {
      return false
    }
  })
}

function readApiJsonFile(apiJsonPath: string): ApiJsonFile | undefined {
  try {
    return JSON.parse(fs.readFileSync(apiJsonPath, "utf8")) as ApiJsonFile
  } catch {
    return undefined
  }
}

// A Custom API script belongs to exactly one api.json: the file in the same directory.
export function getRequiredCustomApiExportsForScriptFile(
  filePath: string,
): RequiredCustomApiExport[] {
  const directory = path.dirname(path.resolve(filePath))
  const apiJson = readApiJsonFile(path.join(directory, "api.json"))
  if (!apiJson) {
    return []
  }

  const normalizedFilePath = path.resolve(filePath)
  const requiredExports: RequiredCustomApiExport[] = []

  for (const entry of apiJson.endpoints ?? []) {
    if (!entry.endpoint || !entry.implementation) {
      continue
    }

    const resolvedScriptPath = resolveCustomApiScriptPath(directory, entry.implementation)
    if (resolvedScriptPath !== normalizedFilePath) {
      continue
    }

    requiredExports.push({
      operationId: entry.endpoint,
      schemaPath: path.join(directory, entry.schema ?? "schema.yaml"),
    })
  }

  return requiredExports
}

export function findCustomApiDefinitions(cartridgesDir: string): CustomApiDefinition[] {
  const apiJsonFiles = findApiJsonFiles(cartridgesDir).sort((left, right) =>
    left.localeCompare(right),
  )
  const documentCache = new Map<string, OasDocument>()
  const definitions: CustomApiDefinition[] = []

  for (const apiJsonPath of apiJsonFiles) {
    const directory = path.dirname(apiJsonPath)
    const apiJson = readApiJsonFile(apiJsonPath)

    for (const entry of apiJson?.endpoints ?? []) {
      if (!entry.endpoint || !entry.schema) {
        continue
      }

      const schemaPath = path.join(directory, entry.schema)
      let document = documentCache.get(schemaPath)
      if (!document) {
        const loaded = loadOasDocument(schemaPath)
        if (!loaded) {
          continue
        }

        document = loaded
        documentCache.set(schemaPath, document)
      }

      definitions.push({
        apiJsonPath,
        endpoint: entry.endpoint,
        schemaPath,
        document,
        operation: findOperationByOperationId(document, entry.endpoint),
      })
    }
  }

  return definitions
}
