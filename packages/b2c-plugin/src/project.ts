import {
  createSfccProjectGraph,
  filterSfccProjectGraph,
  findCustomApiDefinitions,
  findResolvedHookRegistrations,
  findResolvedStepTypeDefinitions,
  resolveCartridgeRoots,
  resolveCartridgesDir,
  validateSfccProject,
  type SfccProjectGraph,
  type SfccProjectGraphDirection,
  type SfccProjectValidationResult,
} from "@commerce-klaus/sfcc-module-resolver"
import fs from "node:fs"
import path from "node:path"

export type ProjectOptions = {
  cwd: string
  cartridgesDir: string
  cartridgePath?: string
}

export type ProjectInspection = {
  cartridgesDirectory: string
  cartridgeOrder: string[]
  hooks: Array<{ name: string; scriptPath: string }>
  jobSteps: Array<{ typeId: string; modulePath: string }>
  customApis: Array<{ endpoint: string; schemaPath: string }>
}

export type ProjectValidation = SfccProjectValidationResult & {
  cartridgesDirectory: string
  cartridgeOrder: string[]
}

export type ProjectGraph = SfccProjectGraph
export type ProjectGraphDirection = SfccProjectGraphDirection

export function getProjectGraph(
  options: ProjectOptions & {
    depth?: number
    direction?: SfccProjectGraphDirection
    focus?: string
    module?: string
  },
): ProjectGraph {
  const graph = createSfccProjectGraph({
    cartridgesDir: options.cartridgesDir,
    cwd: options.cwd,
    cartridgePath: options.cartridgePath?.split(":"),
    module: options.module,
  })
  if (!options.focus) {
    return graph
  }

  const focusedGraph = filterSfccProjectGraph(graph, {
    focus: options.focus,
    depth: options.depth,
    direction: options.direction,
  })
  if (focusedGraph.nodes.length === 0) {
    throw new Error(`No graph nodes match focus: ${options.focus}`)
  }

  return focusedGraph
}

export function getProjectInspection(options: ProjectOptions): ProjectInspection {
  const cartridgesDirectory = resolveCartridgesDir(options.cartridgesDir, options.cwd)
  const cartridgeRoots = resolveCartridgeRoots({
    basePath: options.cartridgesDir,
    cwd: options.cwd,
    cartridgePath: options.cartridgePath?.split(":"),
  })

  return {
    cartridgesDirectory,
    cartridgeOrder: cartridgeRoots,
    hooks: findResolvedHookRegistrations(cartridgeRoots).map(({ name, scriptPath }) => ({
      name,
      scriptPath,
    })),
    jobSteps: findResolvedStepTypeDefinitions(cartridgeRoots).map(({ typeId, modulePath }) => ({
      typeId,
      modulePath,
    })),
    customApis: findCustomApiDefinitions(cartridgesDirectory).map(({ endpoint, schemaPath }) => ({
      endpoint,
      schemaPath,
    })),
  }
}

export function validateProject(options: ProjectOptions): ProjectValidation {
  const cartridgesDirectory = resolveCartridgesDir(options.cartridgesDir, options.cwd)
  const cartridgeOrder = resolveCartridgeRoots({
    basePath: options.cartridgesDir,
    cwd: options.cwd,
    cartridgePath: options.cartridgePath?.split(":"),
  })

  return {
    cartridgesDirectory,
    cartridgeOrder,
    ...validateSfccProject({ cartridgesDir: cartridgesDirectory, cartridgeRoots: cartridgeOrder }),
  }
}

export type DoctorFinding = {
  level: "error" | "warning"
  message: string
}

export type DoctorResult = {
  ok: boolean
  cartridgesDirectory: string
  cartridgeOrder: string[]
  findings: DoctorFinding[]
}

export function diagnoseProject(options: ProjectOptions): DoctorResult {
  const inspection = getProjectInspection(options)
  const findings: DoctorFinding[] = []

  if (!fs.existsSync(inspection.cartridgesDirectory)) {
    findings.push({
      level: "error",
      message: `Cartridges directory does not exist: ${inspection.cartridgesDirectory}`,
    })
  } else if (inspection.cartridgeOrder.length === 0) {
    findings.push({ level: "error", message: "No cartridges were found" })
  }

  const configuredCartridges = options.cartridgePath
    ?.split(":")
    .map((entry) => entry.trim())
    .filter(Boolean)
  for (const cartridge of configuredCartridges ?? []) {
    if (!fs.existsSync(path.join(inspection.cartridgesDirectory, cartridge))) {
      findings.push({
        level: "error",
        message: `Configured cartridge was not found: ${cartridge}`,
      })
    }
  }

  for (const cartridgeRoot of inspection.cartridgeOrder) {
    if (!fs.existsSync(path.join(cartridgeRoot, "cartridge"))) {
      findings.push({
        level: "warning",
        message: `Cartridge has no cartridge directory: ${path.basename(cartridgeRoot)}`,
      })
    }
  }

  return {
    ok: !findings.some((finding) => finding.level === "error"),
    cartridgesDirectory: inspection.cartridgesDirectory,
    cartridgeOrder: inspection.cartridgeOrder,
    findings,
  }
}
