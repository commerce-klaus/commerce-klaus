import {
  type CustomApiOperationMatch,
  type OasDocument,
  type OasParameter,
  type OasResponse,
  type OasSchema,
  resolveOasParameter,
  resolveOasRef,
  resolveOasRequestBody,
} from "./discovery.ts"

export interface OasValidationIssue {
  message: string
  path: string
}

export interface OasRequestValidationInput {
  body?: unknown
  headers?: Record<string, unknown>
  pathParameters?: Record<string, unknown>
  queryParameters?: Record<string, unknown>
}

export interface OasResponseValidationInput {
  body: unknown
  statusCode: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right)
}

function resolveSchema(schema: OasSchema, document: OasDocument): OasSchema | undefined {
  return schema.$ref ? (resolveOasRef(schema.$ref, document) as OasSchema | undefined) : schema
}

function getSchemaType(schema: OasSchema): string | undefined {
  if (schema.type) {
    return schema.type
  }
  if (schema.properties || schema.required) {
    return "object"
  }
  return schema.items ? "array" : undefined
}

function validateOasValueInternal(
  value: unknown,
  schema: OasSchema,
  document: OasDocument,
  path: string,
  visitedRefs: WeakMap<object, Set<string>>,
): OasValidationIssue[] {
  if (schema.$ref) {
    const resolved = resolveSchema(schema, document)
    if (!resolved) {
      return [{ message: `references unknown schema ${schema.$ref}.`, path }]
    }
    const objectValue = typeof value === "object" && value !== null ? value : undefined
    const visitedForValue = objectValue ? visitedRefs.get(objectValue) : undefined
    if (visitedForValue?.has(schema.$ref)) {
      return []
    }
    if (objectValue) {
      const refs = visitedForValue ?? new Set<string>()
      refs.add(schema.$ref)
      visitedRefs.set(objectValue, refs)
    }
    const issues = validateOasValueInternal(value, resolved, document, path, visitedRefs)
    if (objectValue) {
      visitedRefs.get(objectValue)?.delete(schema.$ref)
    }
    return issues
  }

  if (value === null) {
    return schema.nullable
      ? []
      : [{ message: `must be ${getSchemaType(schema) ?? "the declared schema"}, not null.`, path }]
  }

  if (schema.enum && !schema.enum.some((entry) => valuesEqual(entry, value))) {
    return [{ message: `must be one of ${schema.enum.map(String).join(", ")}.`, path }]
  }

  switch (getSchemaType(schema)) {
    case "string":
      return typeof value === "string" ? [] : [{ message: "must be a string.", path }]
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? []
        : [{ message: "must be a finite number.", path }]
    case "integer":
      return typeof value === "number" && Number.isInteger(value)
        ? []
        : [{ message: "must be an integer.", path }]
    case "boolean":
      return typeof value === "boolean" ? [] : [{ message: "must be a boolean.", path }]
    case "array": {
      if (!Array.isArray(value)) {
        return [{ message: "must be an array.", path }]
      }
      const itemSchema = schema.items
      return itemSchema
        ? value.flatMap((item, index) =>
            validateOasValueInternal(item, itemSchema, document, `${path}[${index}]`, visitedRefs),
          )
        : []
    }
    case "object": {
      if (!isRecord(value)) {
        return [{ message: "must be an object.", path }]
      }
      const issues: OasValidationIssue[] = []
      for (const requiredProperty of schema.required ?? []) {
        if (!Object.hasOwn(value, requiredProperty)) {
          issues.push({ message: "is required.", path: `${path}.${requiredProperty}` })
        }
      }
      for (const [name, propertyValue] of Object.entries(value)) {
        const propertySchema = schema.properties?.[name]
        if (propertySchema) {
          issues.push(
            ...validateOasValueInternal(
              propertyValue,
              propertySchema,
              document,
              `${path}.${name}`,
              visitedRefs,
            ),
          )
          continue
        }
        if (schema.additionalProperties === false) {
          issues.push({ message: "is not allowed.", path: `${path}.${name}` })
        } else if (isRecord(schema.additionalProperties)) {
          issues.push(
            ...validateOasValueInternal(
              propertyValue,
              schema.additionalProperties,
              document,
              `${path}.${name}`,
              visitedRefs,
            ),
          )
        }
      }
      return issues
    }
    default:
      return []
  }
}

export function validateOasValue(
  value: unknown,
  schema: OasSchema,
  document: OasDocument,
  path = "$",
): OasValidationIssue[] {
  return validateOasValueInternal(value, schema, document, path, new WeakMap())
}

function getParameterValue(
  parameter: OasParameter,
  input: OasRequestValidationInput,
): { path: string; present: boolean; value: unknown } | undefined {
  if (!parameter.name) {
    return undefined
  }
  const location = parameter.in
  const values =
    location === "path"
      ? input.pathParameters
      : location === "query"
        ? input.queryParameters
        : location === "header"
          ? Object.fromEntries(
              Object.entries(input.headers ?? {}).map(([name, value]) => [
                name.toLowerCase(),
                value,
              ]),
            )
          : undefined
  if (!values) {
    return location === "path" || location === "query" || location === "header"
      ? {
          path: `request.${location}.${parameter.name}`,
          present: false,
          value: undefined,
        }
      : undefined
  }
  const name = location === "header" ? parameter.name.toLowerCase() : parameter.name
  return {
    path: `request.${location}.${parameter.name}`,
    present: Object.hasOwn(values, name),
    value: values[name],
  }
}

export function validateOasRequest(
  operation: CustomApiOperationMatch,
  document: OasDocument,
  input: OasRequestValidationInput,
): OasValidationIssue[] {
  const issues: OasValidationIssue[] = []
  const parameters = new Map<string, OasParameter>()

  for (const unresolvedParameter of [
    ...(operation.pathItem.parameters ?? []),
    ...(operation.operation.parameters ?? []),
  ]) {
    const parameter = resolveOasParameter(unresolvedParameter, document)
    if (!parameter) {
      issues.push({
        message: `references unknown parameter ${unresolvedParameter.$ref}.`,
        path: "request.parameters",
      })
      continue
    }
    parameters.set(`${parameter.in}:${parameter.name}`, parameter)
  }

  for (const parameter of parameters.values()) {
    const parameterValue = getParameterValue(parameter, input)
    if (!parameterValue) {
      continue
    }
    if (!parameterValue.present) {
      if (parameter.required) {
        issues.push({ message: "is required.", path: parameterValue.path })
      }
      continue
    }
    if (parameter.schema) {
      issues.push(
        ...validateOasValue(parameterValue.value, parameter.schema, document, parameterValue.path),
      )
    }
  }

  const requestBody = resolveOasRequestBody(operation.operation.requestBody, document)
  if (!requestBody) {
    if (operation.operation.requestBody?.$ref) {
      issues.push({
        message: `references unknown request body ${operation.operation.requestBody.$ref}.`,
        path: "request.body",
      })
    }
    return issues
  }
  if (input.body === undefined) {
    if (requestBody.required) {
      issues.push({ message: "is required.", path: "request.body" })
    }
    return issues
  }
  const schema = requestBody.content?.["application/json"]?.schema
  return schema
    ? [...issues, ...validateOasValue(input.body, schema, document, "request.body")]
    : issues
}

function resolveResponse(
  response: OasResponse | undefined,
  document: OasDocument,
): OasResponse | undefined {
  return response?.$ref
    ? (resolveOasRef(response.$ref, document) as OasResponse | undefined)
    : response
}

export function validateOasResponse(
  operation: CustomApiOperationMatch,
  document: OasDocument,
  input: OasResponseValidationInput,
): OasValidationIssue[] {
  const responses = operation.operation.responses ?? {}
  const statusCode = String(input.statusCode)
  const statusRange = `${statusCode[0]}XX`
  const declaredResponse =
    responses[statusCode] ??
    responses[statusRange] ??
    responses[statusRange.toLowerCase()] ??
    responses.default
  if (!declaredResponse) {
    return [
      {
        message: `status ${input.statusCode} is not declared by the operation.`,
        path: "response.statusCode",
      },
    ]
  }

  const response = resolveResponse(declaredResponse, document)
  if (!response) {
    return [
      {
        message: `references unknown response ${declaredResponse.$ref}.`,
        path: `response.${statusCode}`,
      },
    ]
  }
  const schema = response.content?.["application/json"]?.schema
  if (schema) {
    return validateOasValue(input.body, schema, document, "response.body")
  }
  return response.content === undefined && input.body !== undefined
    ? [{ message: "must be empty.", path: "response.body" }]
    : []
}
