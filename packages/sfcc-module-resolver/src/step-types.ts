import fs from "node:fs"
import path from "node:path"

import { resolveCandidateFile } from "./module-resolution.ts"

export interface ScriptModuleStepTypeDefinition {
  functionName: string
  kind: "script-module-step"
  module: string
  typeId: string
}

export interface ChunkStepFunctions {
  afterChunk?: string
  afterStep?: string
  beforeChunk?: string
  beforeStep?: string
  getTotalCount?: string
  process?: string
  read: string
  write: string
}

export interface ChunkScriptModuleStepTypeDefinition {
  chunkSize: number
  functions: ChunkStepFunctions
  kind: "chunk-script-module-step"
  module: string
  typeId: string
}

export type StepTypeDefinition =
  | ScriptModuleStepTypeDefinition
  | ChunkScriptModuleStepTypeDefinition

export type ResolvedStepTypeDefinition = StepTypeDefinition & {
  modulePath: string
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null
}

function readString(record: UnknownRecord, name: string): string | undefined {
  const value = record[name]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function parseScriptModuleStep(value: unknown): ScriptModuleStepTypeDefinition | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const typeId = readString(value, "@type-id")
  const module = readString(value, "module")
  const functionName = readString(value, "function")
  return typeId && module && functionName
    ? { functionName, kind: "script-module-step", module, typeId }
    : undefined
}

const CHUNK_FUNCTION_FIELDS = {
  afterChunk: "after-chunk-function",
  afterStep: "after-step-function",
  beforeChunk: "before-chunk-function",
  beforeStep: "before-step-function",
  getTotalCount: "total-count-function",
  process: "process-function",
  read: "read-function",
  write: "write-function",
} as const

function parseChunkScriptModuleStep(
  value: unknown,
): ChunkScriptModuleStepTypeDefinition | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const typeId = readString(value, "@type-id")
  const module = readString(value, "module")
  const rawChunkSize = value["chunk-size"]
  const chunkSize =
    typeof rawChunkSize === "string" && rawChunkSize.length > 0
      ? Number(rawChunkSize)
      : rawChunkSize
  const read = readString(value, CHUNK_FUNCTION_FIELDS.read)
  const write = readString(value, CHUNK_FUNCTION_FIELDS.write)
  if (
    !typeId ||
    !module ||
    !Number.isInteger(chunkSize) ||
    (chunkSize as number) <= 0 ||
    !read ||
    !write
  ) {
    return undefined
  }

  const functions: ChunkStepFunctions = { read, write }
  for (const [name, field] of Object.entries(CHUNK_FUNCTION_FIELDS)) {
    if (name === "read" || name === "write") {
      continue
    }
    const functionName = readString(value, field)
    if (functionName) {
      functions[name as keyof Omit<ChunkStepFunctions, "read" | "write">] = functionName
    }
  }

  return {
    chunkSize: chunkSize as number,
    functions,
    kind: "chunk-script-module-step",
    module,
    typeId,
  }
}

export function getStepTypeDefinitionsFromDocument(
  document: unknown,
): StepTypeDefinition[] | undefined {
  if (!isRecord(document) || !isRecord(document["step-types"])) {
    return undefined
  }

  const stepTypes = document["step-types"]
  const scriptSteps = stepTypes["script-module-step"]
  const chunkSteps = stepTypes["chunk-script-module-step"]
  if (scriptSteps === undefined && chunkSteps === undefined) {
    return undefined
  }
  if (
    (scriptSteps !== undefined && !Array.isArray(scriptSteps)) ||
    (chunkSteps !== undefined && !Array.isArray(chunkSteps))
  ) {
    return undefined
  }

  const parsedScriptSteps = (scriptSteps ?? []).map(parseScriptModuleStep)
  const parsedChunkSteps = (chunkSteps ?? []).map(parseChunkScriptModuleStep)
  const definitions = [...parsedScriptSteps, ...parsedChunkSteps]
  return definitions.every((definition) => definition !== undefined)
    ? (definitions as StepTypeDefinition[])
    : undefined
}

export function findResolvedStepTypeDefinitions(
  cartridgeRoots: string[],
): ResolvedStepTypeDefinition[] {
  const definitions: ResolvedStepTypeDefinition[] = []
  const registeredTypeIds = new Set<string>()

  for (const cartridgeRoot of cartridgeRoots) {
    let cartridgeDefinitions: StepTypeDefinition[] | undefined
    try {
      const document = JSON.parse(
        fs.readFileSync(path.join(cartridgeRoot, "steptypes.json"), "utf8"),
      )
      cartridgeDefinitions = getStepTypeDefinitionsFromDocument(document)
    } catch {
      continue
    }

    if (!cartridgeDefinitions) {
      continue
    }

    for (const definition of cartridgeDefinitions) {
      if (registeredTypeIds.has(definition.typeId)) {
        continue
      }

      const modulePath = resolveCandidateFile(
        path.resolve(path.dirname(cartridgeRoot), definition.module),
        definition.module,
      )
      if (!modulePath) {
        continue
      }

      registeredTypeIds.add(definition.typeId)
      definitions.push({ ...definition, modulePath })
    }
  }

  return definitions
}
