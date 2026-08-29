import {
  type CustomApiOperationMatch,
  type OasDocument,
  type OasSchema,
  findCartridgesDir,
  findCustomApiDefinitions,
  findSuccessOasResponse,
  resolveOasParameter,
  resolveOasRef,
  resolveOasRequestBody,
} from "@commerce-klaus/sfcc-module-resolver"
import {
  existsSync as nodeExistsSync,
  mkdirSync as nodeMkdirSync,
  writeFileSync as nodeWriteFileSync,
} from "node:fs"
import path from "node:path"

export const GENERATED_CUSTOM_APIS_FILE_NAME = "sfcc-custom-apis.generated.d.ts"

export interface GenerateCustomApiTypesOptions {
  workspaceRoot: string
  cartridgesDir?: string
  existsSync?: (filePath: string) => boolean
  mkdirSync?: (dirPath: string, options: { recursive: boolean }) => void
  writeFileSync?: (filePath: string, content: string, encoding: BufferEncoding) => void
}

export interface GenerateCustomApiTypesResult {
  outputFilePath: string
  sourceFiles: string[]
  written: boolean
  schemasCount: number
  operationsCount: number
}

export function generateCustomApiTypes(
  options: GenerateCustomApiTypesOptions,
): GenerateCustomApiTypesResult {
  const existsSync = options.existsSync ?? nodeExistsSync
  const mkdirSync = options.mkdirSync ?? nodeMkdirSync
  const writeFileSync = options.writeFileSync ?? nodeWriteFileSync

  const outputFilePath = path.join(
    options.workspaceRoot,
    ".b2c-script-types",
    "types",
    GENERATED_CUSTOM_APIS_FILE_NAME,
  )
  const cartridgesDir =
    options.cartridgesDir ??
    findCartridgesDir(options.workspaceRoot) ??
    path.join(options.workspaceRoot, "cartridges")

  if (!existsSync(cartridgesDir)) {
    return { outputFilePath, sourceFiles: [], written: false, schemasCount: 0, operationsCount: 0 }
  }

  const definitions = findCustomApiDefinitions(cartridgesDir)
  if (definitions.length === 0) {
    return { outputFilePath, sourceFiles: [], written: false, schemasCount: 0, operationsCount: 0 }
  }

  const sourceFiles = [
    ...new Set(
      definitions.flatMap((definition) => [definition.apiJsonPath, definition.schemaPath]),
    ),
  ]
  const schemas = new Map<string, OasSchema>()
  const operations = new Map<string, RenderedOperation>()

  for (const definition of definitions) {
    for (const [schemaName, schema] of Object.entries(
      definition.document.components?.schemas ?? {},
    )) {
      if (!schemas.has(schemaName)) {
        schemas.set(schemaName, schema)
      }
    }

    if (definition.operation && !operations.has(definition.endpoint)) {
      operations.set(definition.endpoint, buildOperation(definition.document, definition.operation))
    }
  }

  if (schemas.size === 0 && operations.size === 0) {
    return { outputFilePath, sourceFiles, written: false, schemasCount: 0, operationsCount: 0 }
  }

  mkdirSync(path.dirname(outputFilePath), { recursive: true })
  writeFileSync(outputFilePath, renderCustomApiTypes(schemas, operations), "utf8")

  return {
    outputFilePath,
    sourceFiles,
    written: true,
    schemasCount: schemas.size,
    operationsCount: operations.size,
  }
}

interface RenderedOperation {
  parametersByLocation: Map<string, Map<string, { typeExpression: string; required: boolean }>>
  requestBody?: { typeExpression: string; required: boolean }
  response?: string
}

function buildOperation(
  document: OasDocument,
  { pathItem, operation }: CustomApiOperationMatch,
): RenderedOperation {
  const parametersByLocation = new Map<
    string,
    Map<string, { typeExpression: string; required: boolean }>
  >()

  for (const rawParameter of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
    const parameter = resolveOasParameter(rawParameter, document)
    if (!parameter?.name || !parameter.in) {
      continue
    }

    const group = parametersByLocation.get(parameter.in) ?? new Map()
    group.set(parameter.name, {
      typeExpression: renderSchemaType(parameter.schema ?? {}, document),
      required: parameter.required === true,
    })
    parametersByLocation.set(parameter.in, group)
  }

  const requestBody = resolveOasRequestBody(operation.requestBody, document)
  const requestBodySchema = requestBody?.content?.["application/json"]?.schema

  const response = findSuccessOasResponse(operation.responses, document)
  const responseSchema = response?.content?.["application/json"]?.schema

  return {
    parametersByLocation,
    requestBody: requestBodySchema
      ? {
          typeExpression: renderSchemaType(requestBodySchema, document),
          required: requestBody?.required === true,
        }
      : undefined,
    response: responseSchema ? renderSchemaType(responseSchema, document) : undefined,
  }
}

function renderSchemaType(schema: OasSchema, document: OasDocument): string {
  if (schema.$ref) {
    const segments = schema.$ref.replace(/^#\//u, "").split("/")
    if (segments[0] === "components" && segments[1] === "schemas" && segments[2]) {
      return `Schemas["${segments[2]}"]`
    }

    const resolved = resolveOasRef(schema.$ref, document)
    return resolved ? renderSchemaType(resolved as OasSchema, document) : "unknown"
  }

  const base = renderSchemaBaseType(schema, document)
  return schema.nullable === true ? `(${base} | null)` : base
}

function renderSchemaBaseType(schema: OasSchema, document: OasDocument): string {
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum
      .map((value) => (typeof value === "string" ? JSON.stringify(value) : String(value)))
      .join(" | ")
  }

  if (schema.type === "array") {
    return `${renderSchemaType(schema.items ?? {}, document)}[]`
  }

  if (schema.type === "object" || schema.properties) {
    return renderObjectType(schema, document)
  }

  switch (schema.type) {
    case "string":
      return "string"
    case "integer":
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    default:
      return "unknown"
  }
}

function renderObjectType(schema: OasSchema, document: OasDocument): string {
  const properties = Object.entries(schema.properties ?? {})
  if (properties.length === 0) {
    return "Record<string, unknown>"
  }

  const required = new Set(schema.required ?? [])
  const members = properties.map(([propertyName, propertySchema]) => {
    const optionalMarker = required.has(propertyName) ? "" : "?"
    return `      ${JSON.stringify(propertyName)}${optionalMarker}: ${renderSchemaType(propertySchema, document)}`
  })

  return ["{", ...members, "    }"].join("\n")
}

function renderCustomApiTypes(
  schemas: Map<string, OasSchema>,
  operations: Map<string, RenderedOperation>,
): string {
  const document: OasDocument = {}
  const schemaNames = [...schemas.keys()].sort((left, right) => left.localeCompare(right))
  const schemaMembers = schemaNames.map(
    (name) => `    ${JSON.stringify(name)}: ${renderSchemaType(schemas.get(name) ?? {}, document)}`,
  )

  const operationNames = [...operations.keys()].sort((left, right) => left.localeCompare(right))
  const operationMembers = operationNames.map((name) =>
    renderOperationMember(name, operations.get(name)),
  )

  return [
    "/* Auto-generated by sfcc-ts-sync-types. Do not edit manually. */",
    "",
    "declare global {",
    "  namespace SfccCustomApis {",
    "    interface Schemas {",
    ...schemaMembers,
    "    }",
    "",
    "    interface Operations {",
    ...operationMembers,
    "    }",
    "  }",
    "}",
    "",
    "export {}",
    "",
  ].join("\n")
}

function renderOperationMember(name: string, operation: RenderedOperation | undefined): string {
  if (!operation) {
    return `    ${JSON.stringify(name)}: Record<string, unknown>`
  }

  const lines = [`    ${JSON.stringify(name)}: {`]

  if (operation.parametersByLocation.size > 0) {
    lines.push("      Parameters: {")
    for (const [location, parameters] of [...operation.parametersByLocation.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      lines.push(`        ${location}: {`)
      for (const [parameterName, parameter] of [...parameters.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        const optionalMarker = parameter.required ? "" : "?"
        lines.push(
          `          ${JSON.stringify(parameterName)}${optionalMarker}: ${parameter.typeExpression}`,
        )
      }

      lines.push("        }")
    }

    lines.push("      }")
  }

  if (operation.requestBody) {
    const optionalMarker = operation.requestBody.required ? "" : "?"
    lines.push(`      RequestBody${optionalMarker}: ${operation.requestBody.typeExpression}`)
  }

  lines.push(`      Response: ${operation.response ?? "unknown"}`)
  lines.push("    }")

  return lines.join("\n")
}
