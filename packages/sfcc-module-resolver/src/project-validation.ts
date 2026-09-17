import fs from "node:fs"
import path from "node:path"

import {
  findApiJsonFiles,
  findOperationByOperationId,
  loadOasDocument,
  resolveCustomApiScriptPath,
  type ApiJsonEndpoint,
  type ApiJsonFile,
} from "./custom-api.ts"
import {
  getCartridgeHooksJsonPath,
  getHookRegistrationsFromDocument,
  resolveHookScriptPath,
} from "./hooks.ts"
import { resolveCandidateFile } from "./module-resolution.ts"
import { getStepTypeDefinitionsFromDocument } from "./step-types.ts"

export type SfccProjectDiagnosticSeverity = "error" | "warning"

export type SfccProjectDiagnostic = {
  code: string
  severity: SfccProjectDiagnosticSeverity
  file: string
  message: string
}

export type SfccProjectValidationResult = {
  ok: boolean
  errors: number
  warnings: number
  diagnostics: SfccProjectDiagnostic[]
}

export type ValidateSfccProjectOptions = {
  cartridgesDir: string
  cartridgeRoots: string[]
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown
}

function addDiagnostic(
  diagnostics: SfccProjectDiagnostic[],
  diagnostic: SfccProjectDiagnostic,
): void {
  diagnostics.push(diagnostic)
}

function validateHooks(cartridgeRoots: string[], diagnostics: SfccProjectDiagnostic[]): void {
  const registeredHooks = new Map<string, string>()

  for (const cartridgeRoot of cartridgeRoots) {
    const packagePath = path.join(cartridgeRoot, "package.json")
    let hooksJsonPath: string | undefined

    if (fs.existsSync(packagePath)) {
      try {
        const packageDocument = readJson(packagePath) as { hooks?: unknown }
        if (
          packageDocument.hooks !== undefined &&
          (typeof packageDocument.hooks !== "string" || packageDocument.hooks.length === 0)
        ) {
          addDiagnostic(diagnostics, {
            code: "invalid-hooks-declaration",
            severity: "error",
            file: packagePath,
            message: "The package hooks field must be a non-empty string.",
          })
          continue
        }
        hooksJsonPath = getCartridgeHooksJsonPath(cartridgeRoot)
      } catch {
        addDiagnostic(diagnostics, {
          code: "invalid-cartridge-package",
          severity: "error",
          file: packagePath,
          message: "The cartridge package.json is not valid JSON.",
        })
        continue
      }
    }

    if (!hooksJsonPath) {
      continue
    }
    if (!fs.existsSync(hooksJsonPath)) {
      addDiagnostic(diagnostics, {
        code: "hooks-file-not-found",
        severity: "error",
        file: packagePath,
        message: `The declared hooks file was not found: ${hooksJsonPath}`,
      })
      continue
    }

    let registrations
    try {
      registrations = getHookRegistrationsFromDocument(readJson(hooksJsonPath))
    } catch {
      registrations = undefined
    }
    if (!registrations) {
      addDiagnostic(diagnostics, {
        code: "invalid-hooks-file",
        severity: "error",
        file: hooksJsonPath,
        message: "The hooks file must contain a valid hooks array.",
      })
      continue
    }

    for (const registration of registrations) {
      const scriptPath = resolveHookScriptPath(path.dirname(hooksJsonPath), registration.script)
      if (!scriptPath) {
        addDiagnostic(diagnostics, {
          code: "hook-script-not-found",
          severity: "error",
          file: hooksJsonPath,
          message: `Script for hook ${registration.name} was not found: ${registration.script}`,
        })
        continue
      }

      const effectiveFile = registeredHooks.get(registration.name)
      if (effectiveFile) {
        addDiagnostic(diagnostics, {
          code: "hook-overridden",
          severity: "warning",
          file: hooksJsonPath,
          message: `Hook ${registration.name} is overridden by the registration in ${effectiveFile}`,
        })
      } else {
        registeredHooks.set(registration.name, hooksJsonPath)
      }
    }
  }
}

function validateStepTypes(cartridgeRoots: string[], diagnostics: SfccProjectDiagnostic[]): void {
  const registeredStepTypes = new Map<string, string>()

  for (const cartridgeRoot of cartridgeRoots) {
    const stepTypesPath = path.join(cartridgeRoot, "steptypes.json")
    if (!fs.existsSync(stepTypesPath)) {
      continue
    }

    let definitions
    try {
      definitions = getStepTypeDefinitionsFromDocument(readJson(stepTypesPath))
    } catch {
      definitions = undefined
    }
    if (!definitions) {
      addDiagnostic(diagnostics, {
        code: "invalid-step-types-file",
        severity: "error",
        file: stepTypesPath,
        message: "The step types file does not contain valid step definitions.",
      })
      continue
    }

    for (const definition of definitions) {
      const modulePath = resolveCandidateFile(
        path.resolve(path.dirname(cartridgeRoot), definition.module),
        definition.module,
      )
      if (!modulePath) {
        addDiagnostic(diagnostics, {
          code: "step-module-not-found",
          severity: "error",
          file: stepTypesPath,
          message: `Module for job step ${definition.typeId} was not found: ${definition.module}`,
        })
        continue
      }

      const effectiveFile = registeredStepTypes.get(definition.typeId)
      if (effectiveFile) {
        addDiagnostic(diagnostics, {
          code: "step-type-overridden",
          severity: "warning",
          file: stepTypesPath,
          message: `Job step ${definition.typeId} is overridden by the definition in ${effectiveFile}`,
        })
      } else {
        registeredStepTypes.set(definition.typeId, stepTypesPath)
      }
    }
  }
}

function isApiEndpoint(value: unknown): value is ApiJsonEndpoint {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function validateCustomApiEndpoint(
  apiJsonPath: string,
  endpoint: ApiJsonEndpoint,
  diagnostics: SfccProjectDiagnostic[],
): void {
  const directory = path.dirname(apiJsonPath)
  if (
    !isNonEmptyString(endpoint.endpoint) ||
    !isNonEmptyString(endpoint.schema) ||
    !isNonEmptyString(endpoint.implementation)
  ) {
    addDiagnostic(diagnostics, {
      code: "invalid-custom-api-endpoint",
      severity: "error",
      file: apiJsonPath,
      message: "Each Custom API endpoint requires endpoint, schema, and implementation fields.",
    })
    return
  }

  const schemaPath = path.join(directory, endpoint.schema)
  if (!fs.existsSync(schemaPath)) {
    addDiagnostic(diagnostics, {
      code: "custom-api-schema-not-found",
      severity: "error",
      file: apiJsonPath,
      message: `Schema for Custom API ${endpoint.endpoint} was not found: ${endpoint.schema}`,
    })
  } else {
    try {
      const document = loadOasDocument(schemaPath)
      if (!document || !findOperationByOperationId(document, endpoint.endpoint)) {
        addDiagnostic(diagnostics, {
          code: "custom-api-operation-not-found",
          severity: "error",
          file: schemaPath,
          message: `Operation ${endpoint.endpoint} was not found in the Custom API schema.`,
        })
      }
    } catch {
      addDiagnostic(diagnostics, {
        code: "invalid-custom-api-schema",
        severity: "error",
        file: schemaPath,
        message: `Schema for Custom API ${endpoint.endpoint} could not be parsed.`,
      })
    }
  }

  if (!resolveCustomApiScriptPath(directory, endpoint.implementation)) {
    addDiagnostic(diagnostics, {
      code: "custom-api-script-not-found",
      severity: "error",
      file: apiJsonPath,
      message: `Implementation for Custom API ${endpoint.endpoint} was not found: ${endpoint.implementation}`,
    })
  }
}

function validateCustomApis(cartridgesDir: string, diagnostics: SfccProjectDiagnostic[]): void {
  for (const apiJsonPath of findApiJsonFiles(cartridgesDir).sort((left, right) =>
    left.localeCompare(right),
  )) {
    let apiDocument: ApiJsonFile | undefined
    try {
      const document = readJson(apiJsonPath)
      if (typeof document === "object" && document !== null) {
        apiDocument = document as ApiJsonFile
      }
    } catch {
      apiDocument = undefined
    }

    if (!apiDocument || !Array.isArray(apiDocument.endpoints)) {
      addDiagnostic(diagnostics, {
        code: "invalid-custom-api-file",
        severity: "error",
        file: apiJsonPath,
        message: "The Custom API file must contain a valid endpoints array.",
      })
      continue
    }

    for (const endpoint of apiDocument.endpoints) {
      if (!isApiEndpoint(endpoint)) {
        addDiagnostic(diagnostics, {
          code: "invalid-custom-api-endpoint",
          severity: "error",
          file: apiJsonPath,
          message: "Each Custom API endpoint must be an object.",
        })
        continue
      }
      validateCustomApiEndpoint(apiJsonPath, endpoint, diagnostics)
    }
  }
}

export function validateSfccProject(
  options: ValidateSfccProjectOptions,
): SfccProjectValidationResult {
  const diagnostics: SfccProjectDiagnostic[] = []
  validateHooks(options.cartridgeRoots, diagnostics)
  validateStepTypes(options.cartridgeRoots, diagnostics)
  validateCustomApis(options.cartridgesDir, diagnostics)

  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  const warnings = diagnostics.length - errors
  return { ok: errors === 0, errors, warnings, diagnostics }
}
