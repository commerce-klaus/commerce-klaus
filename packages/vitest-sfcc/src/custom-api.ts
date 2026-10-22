import { type ResolvedCustomApiDefinition } from "@commerce-klaus/sfcc-module-resolver/custom-apis"
import {
  getSfccTestRuntime,
  type SfccCustomApiInvocation,
  type SfccCustomApiInvokeOptions,
  type SfccCustomApiModule,
} from "@commerce-klaus/sfcc-test-runtime"

import { CARTRIDGE_MODULE_SUFFIX } from "./cartridge-transform.js"

const ACTIVE_CUSTOM_APIS = Symbol.for("@commerce-klaus/vitest-sfcc.custom-apis")
export const CUSTOM_API_DEFINITIONS_DEFINE = "__COMMERCE_KLAUS_CUSTOM_API_DEFINITIONS__"

declare const __COMMERCE_KLAUS_CUSTOM_API_DEFINITIONS__: ResolvedCustomApiDefinition[] | undefined

type CustomApiGlobal = typeof globalThis & {
  [ACTIVE_CUSTOM_APIS]?: ResolvedCustomApiDefinition[]
}

declare global {
  namespace SfccCustomApis {
    interface Operations {}
  }
}

type RegisteredCustomApiOperationId = Extract<keyof SfccCustomApis.Operations, string>

export type SfccCustomApiOperationId = [RegisteredCustomApiOperationId] extends [never]
  ? string
  : RegisteredCustomApiOperationId

type OperationProperty<
  OperationId extends string,
  Property extends PropertyKey,
  Fallback,
> = OperationId extends RegisteredCustomApiOperationId
  ? SfccCustomApis.Operations[OperationId] extends infer Operation
    ? Operation extends Record<Property, infer Value>
      ? Value
      : Fallback
    : Fallback
  : Fallback

type OperationParameters<OperationId extends string, Location extends PropertyKey> =
  OperationProperty<OperationId, "Parameters", Record<string, unknown>> extends infer Parameters
    ? Parameters extends Record<Location, infer Value>
      ? Value
      : Record<string, unknown>
    : Record<string, unknown>

export type SfccCustomApiOperationInput<OperationId extends string> = SfccCustomApiInvokeOptions & {
  body?: OperationProperty<OperationId, "RequestBody", unknown>
  headers?: OperationParameters<OperationId, "header">
  pathParameters?: OperationParameters<OperationId, "path">
  queryParameters?: OperationParameters<OperationId, "query">
}

export interface SfccLoadedCustomApi<OperationId extends string = string> {
  readonly definition: ResolvedCustomApiDefinition
  readonly operationId: OperationId
  invoke(options?: SfccCustomApiOperationInput<OperationId>): Promise<SfccCustomApiInvocation>
}

export function setActiveCustomApis(definitions: ResolvedCustomApiDefinition[]): void {
  ;(globalThis as CustomApiGlobal)[ACTIVE_CUSTOM_APIS] = definitions
}

function findCustomApiDefinition(apiId: string, operationId: string): ResolvedCustomApiDefinition {
  const configuredDefinitions =
    typeof __COMMERCE_KLAUS_CUSTOM_API_DEFINITIONS__ === "undefined"
      ? undefined
      : __COMMERCE_KLAUS_CUSTOM_API_DEFINITIONS__
  const definitions =
    (globalThis as CustomApiGlobal)[ACTIVE_CUSTOM_APIS] ?? configuredDefinitions ?? []
  const apiDefinitions = definitions.filter((definition) => definition.apiId === apiId)
  if (apiDefinitions.length === 0) {
    const available = [...new Set(definitions.map((definition) => definition.apiId))].sort()
    throw new Error(
      `vitest-sfcc could not find Custom API ${apiId}. Available APIs: ${
        available.join(", ") || "none"
      }.`,
    )
  }

  const definition = apiDefinitions.find((candidate) => candidate.endpoint === operationId)
  if (!definition) {
    throw new Error(
      `vitest-sfcc could not find operation ${operationId} in Custom API ${apiId}. Available operations: ${apiDefinitions
        .map((candidate) => candidate.endpoint)
        .sort()
        .join(", ")}.`,
    )
  }
  if (!definition.operation) {
    throw new Error(
      `Custom API ${apiId} operation ${operationId} is not declared in ${definition.schemaPath}.`,
    )
  }
  if (!definition.implementationPath) {
    throw new Error(
      `Custom API ${apiId} operation ${operationId} does not resolve an implementation script.`,
    )
  }

  return definition
}

export async function loadSfccCustomApi<OperationId extends SfccCustomApiOperationId>(
  apiId: string,
  operationId: OperationId,
): Promise<SfccLoadedCustomApi<OperationId>> {
  const definition = findCustomApiDefinition(apiId, operationId)
  const importedModule = (await import(
    /* @vite-ignore */ `${definition.implementationPath}${CARTRIDGE_MODULE_SUFFIX}`
  )) as SfccCustomApiModule & { default?: unknown }
  const defaultExport = importedModule.default
  const customApiModule =
    typeof defaultExport === "object" && defaultExport !== null
      ? { ...defaultExport, ...importedModule }
      : importedModule

  return {
    definition,
    operationId,
    invoke: (options) =>
      getSfccTestRuntime().customApi(customApiModule).invoke(operationId, options),
  }
}
