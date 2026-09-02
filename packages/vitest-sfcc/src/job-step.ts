import {
  type ResolvedStepTypeDefinition,
  type StepTypeParameterDefinition,
} from "@commerce-klaus/sfcc-module-resolver"
import {
  getSfccTestRuntime,
  type SfccJobExecution,
  type SfccJobStepExecution,
  type SfccJobStepHarnessOptions,
  type SfccJobStepModule,
  type SfccJobStepParameters,
} from "@commerce-klaus/sfcc-test-runtime"

import { CARTRIDGE_MODULE_SUFFIX } from "./cartridge-transform.js"

const ACTIVE_STEP_TYPES = Symbol.for("@commerce-klaus/vitest-sfcc.step-types")

type StepTypeGlobal = typeof globalThis & {
  [ACTIVE_STEP_TYPES]?: Map<string, ResolvedStepTypeDefinition>
}

export interface SfccLoadedJobStep {
  readonly definition: ResolvedStepTypeDefinition
  readonly jobExecution: SfccJobExecution
  readonly stepExecution: SfccJobStepExecution
  run(parameters?: SfccJobStepParameters): Promise<unknown>
}

export function setActiveStepTypes(definitions: ResolvedStepTypeDefinition[]): void {
  ;(globalThis as StepTypeGlobal)[ACTIVE_STEP_TYPES] = new Map(
    definitions.map((definition) => [definition.typeId, definition]),
  )
}

function normalizeParameterValue(
  typeId: string,
  parameter: StepTypeParameterDefinition,
  value: unknown,
): unknown {
  if (parameter.type === "boolean") {
    if (typeof value === "boolean") {
      return value
    }
    if (value === "true" || value === "false") {
      return value === "true"
    }
    throw new Error(`SFCC job step ${typeId} parameter ${parameter.name} must be a boolean.`)
  }

  if (parameter.type === "long" || parameter.type === "double") {
    const numberValue = typeof value === "string" && value.length > 0 ? Number(value) : value
    if (
      typeof numberValue !== "number" ||
      !Number.isFinite(numberValue) ||
      (parameter.type === "long" && !Number.isInteger(numberValue))
    ) {
      throw new Error(
        `SFCC job step ${typeId} parameter ${parameter.name} must be a ${parameter.type}.`,
      )
    }
    return numberValue
  }

  if (parameter.type === "string" || parameter.type === "time-string") {
    if (typeof value !== "string") {
      throw new Error(`SFCC job step ${typeId} parameter ${parameter.name} must be a string.`)
    }
    return parameter.trim ? value.trim() : value
  }

  return value
}

function resolveJobStepParameters(
  definition: ResolvedStepTypeDefinition,
  provided: SfccJobStepParameters = {},
): SfccJobStepParameters {
  const resolved = { ...provided }

  for (const parameter of definition.parameters) {
    let value = provided[parameter.name]
    if (value === undefined && Object.hasOwn(parameter, "defaultValue")) {
      value = parameter.defaultValue
    }
    if (typeof value === "string" && parameter.trim) {
      value = value.trim()
    }
    if (value == null || value === "") {
      if (parameter.required) {
        throw new Error(`SFCC job step ${definition.typeId} requires parameter ${parameter.name}.`)
      }
      Reflect.deleteProperty(resolved, parameter.name)
      continue
    }
    resolved[parameter.name] = normalizeParameterValue(definition.typeId, parameter, value)
  }

  return resolved
}

function getJobStepStatusCode(result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) {
    return undefined
  }
  if ("code" in result && typeof result.code === "string") {
    return result.code
  }
  if ("getCode" in result && typeof result.getCode === "function") {
    const code = result.getCode()
    return typeof code === "string" ? code : undefined
  }
  return undefined
}

function validateJobStepStatus(definition: ResolvedStepTypeDefinition, result: unknown): unknown {
  const statusResult =
    definition.kind === "chunk-script-module-step" &&
    typeof result === "object" &&
    result !== null &&
    "afterStepResult" in result
      ? result.afterStepResult
      : result
  const statusCode = getJobStepStatusCode(statusResult)
  if (
    statusCode &&
    definition.statusCodes.length > 0 &&
    !definition.statusCodes.includes(statusCode)
  ) {
    throw new Error(
      `SFCC job step ${definition.typeId} returned undeclared status code ${statusCode}. Expected one of: ${definition.statusCodes.join(", ")}.`,
    )
  }
  return result
}

async function runWithJobStepTimeout(
  typeId: string,
  timeoutSeconds: number,
  operation: () => Promise<unknown>,
): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutResult = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      const unit = timeoutSeconds === 1 ? "second" : "seconds"
      reject(new Error(`SFCC job step ${typeId} timed out after ${timeoutSeconds} ${unit}.`))
    }, timeoutSeconds * 1_000)
  })

  try {
    return await Promise.race([operation(), timeoutResult])
  } finally {
    clearTimeout(timeout)
  }
}

export async function loadSfccJobStep(
  typeId: string,
  options?: SfccJobStepHarnessOptions,
): Promise<SfccLoadedJobStep> {
  const definition = (globalThis as StepTypeGlobal)[ACTIVE_STEP_TYPES]?.get(typeId)
  if (!definition) {
    throw new Error(`vitest-sfcc could not find an SFCC job step with type ID ${typeId}.`)
  }

  const importedModule = (await import(
    /* @vite-ignore */ `${definition.modulePath}${CARTRIDGE_MODULE_SUFFIX}`
  )) as SfccJobStepModule & { default?: unknown }
  const defaultExport = importedModule.default
  const jobStepModule =
    typeof defaultExport === "object" && defaultExport !== null
      ? { ...defaultExport, ...importedModule }
      : importedModule
  const harness = getSfccTestRuntime().jobStep(jobStepModule, {
    ...options,
    stepTypeId: definition.typeId,
  })

  return {
    definition,
    jobExecution: harness.jobExecution,
    stepExecution: harness.stepExecution,
    run: async (parameters) => {
      const resolvedParameters = resolveJobStepParameters(definition, parameters)
      const run = () =>
        definition.kind === "script-module-step"
          ? harness.run(definition.functionName, resolvedParameters)
          : harness.runChunk({
              chunkSize: definition.chunkSize,
              functions: definition.functions,
              parameters: resolvedParameters,
            })
      const result =
        definition.kind === "script-module-step" && definition.timeoutSeconds
          ? await runWithJobStepTimeout(definition.typeId, definition.timeoutSeconds, run)
          : await run()
      return validateJobStepStatus(definition, result)
    },
  }
}
