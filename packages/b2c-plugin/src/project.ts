import { resolveCommerceKlausConfig } from "@commerce-klaus/config"
import { findCustomApiDefinitions } from "@commerce-klaus/sfcc-module-resolver/custom-apis"
import { resolveHookRegistrations } from "@commerce-klaus/sfcc-module-resolver/hooks"
import { resolveStepTypeDefinitions } from "@commerce-klaus/sfcc-module-resolver/job-steps"
import {
  createProjectGraph,
  diffProjectGraphs,
  filterProjectGraph,
  validateProject as validateResolverProject,
  type ProjectGraph as ResolverProjectGraph,
  type ProjectGraphDiff as ResolverProjectGraphDiff,
  type ProjectGraphDirection as ResolverProjectGraphDirection,
  type ProjectValidationResult,
} from "@commerce-klaus/sfcc-module-resolver/project"
import {
  resolveCartridgeRoots,
  resolveCartridgesDir,
} from "@commerce-klaus/sfcc-module-resolver/resolution"
import fs from "node:fs"
import path from "node:path"

export type ProjectOptions = {
  cwd: string
  cartridgesDir?: string
  cartridgePath?: string
  configFile?: string | false
  containingFile?: string
}

export type ResolvedProjectOptions = {
  cwd: string
  cartridgesDirectory: string
  cartridgeRoots: string[]
  configuredCartridgePath?: string[]
}

export type ProjectInspection = {
  cartridgesDirectory: string
  cartridgeOrder: string[]
  hooks: Array<{ name: string; scriptPath: string }>
  jobSteps: Array<{ typeId: string; modulePath: string }>
  customApis: Array<{ endpoint: string; schemaPath: string }>
}

export type ProjectValidation = ProjectValidationResult & {
  cartridgesDirectory: string
  cartridgeOrder: string[]
}

export type ProjectGraph = ResolverProjectGraph
export type ProjectGraphDiff = ResolverProjectGraphDiff
export type ProjectGraphDirection = ResolverProjectGraphDirection
export type ProjectImpact = ProjectGraph & { file: string }

export function resolveProjectOptions(options: ProjectOptions): ResolvedProjectOptions {
  const config = resolveCommerceKlausConfig({
    cwd: options.cwd,
    configFile: options.configFile,
    overrides: {
      cartridgesDir: options.cartridgesDir,
      cartridgePath: options.cartridgePath?.split(":"),
    },
  })
  const cartridgesDirectory = resolveCartridgesDir(
    config.cartridgesDir ?? "cartridges",
    options.cwd,
  )
  const cartridgeRoots = resolveCartridgeRoots({
    basePath: cartridgesDirectory,
    cwd: options.cwd,
    cartridgePath: config.cartridgePath,
    siteTemplatePath: config.siteTemplatePath,
    site: config.site,
    solutionConfigPath: config.solutionConfigPath,
    envCartridgePath: config.envCartridgePath,
    configFile: false,
    containingFile: options.containingFile
      ? path.resolve(options.cwd, options.containingFile)
      : undefined,
  })

  return {
    cwd: options.cwd,
    cartridgesDirectory,
    cartridgeRoots,
    configuredCartridgePath: config.cartridgePath,
  }
}

export function getProjectGraphDiff(
  options: ProjectOptions & { comparisonCartridgePath: string },
): ProjectGraphDiff {
  const project = resolveProjectOptions(options)
  const sharedOptions = {
    cartridgesDir: project.cartridgesDirectory,
    cwd: project.cwd,
  }

  return diffProjectGraphs(
    createProjectGraph({
      ...sharedOptions,
      cartridgePath: project.cartridgeRoots.map((root) => path.basename(root)),
    }),
    createProjectGraph({
      ...sharedOptions,
      cartridgePath: options.comparisonCartridgePath.split(":"),
    }),
  )
}

export function getProjectImpact(
  options: ProjectOptions & { depth?: number; file: string },
): ProjectImpact {
  const project = resolveProjectOptions(options)
  const file = path.resolve(options.cwd, options.file)
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`File does not exist: ${file}`)
  }

  const graph = createProjectGraph({
    cartridgesDir: project.cartridgesDirectory,
    cwd: project.cwd,
    cartridgePath: project.cartridgeRoots.map((root) => path.basename(root)),
  })
  if (!graph.nodes.some((node) => node.path === file)) {
    throw new Error(`File is not represented in the project graph: ${file}`)
  }

  return {
    ...filterProjectGraph(graph, {
      focus: file,
      depth: options.depth,
      direction: "both",
    }),
    file,
  }
}

export function getProjectGraph(
  options: ProjectOptions & {
    depth?: number
    direction?: ResolverProjectGraphDirection
    focus?: string
    module?: string
  },
): ProjectGraph {
  const project = resolveProjectOptions(options)
  const graph = createProjectGraph({
    cartridgesDir: project.cartridgesDirectory,
    cwd: project.cwd,
    cartridgePath: project.cartridgeRoots.map((root) => path.basename(root)),
    module: options.module,
  })
  if (!options.focus) {
    return graph
  }

  const focusedGraph = filterProjectGraph(graph, {
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
  const { cartridgesDirectory, cartridgeRoots } = resolveProjectOptions(options)

  return {
    cartridgesDirectory,
    cartridgeOrder: cartridgeRoots,
    hooks: resolveHookRegistrations(cartridgeRoots).map(({ name, scriptPath }) => ({
      name,
      scriptPath,
    })),
    jobSteps: resolveStepTypeDefinitions(cartridgeRoots).map(({ typeId, modulePath }) => ({
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
  const { cartridgesDirectory, cartridgeRoots: cartridgeOrder } = resolveProjectOptions(options)

  return {
    cartridgesDirectory,
    cartridgeOrder,
    ...validateResolverProject({
      cartridgesDir: cartridgesDirectory,
      cartridgeRoots: cartridgeOrder,
    }),
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
  const project = resolveProjectOptions(options)
  const findings: DoctorFinding[] = []

  if (!fs.existsSync(inspection.cartridgesDirectory)) {
    findings.push({
      level: "error",
      message: `Cartridges directory does not exist: ${inspection.cartridgesDirectory}`,
    })
  } else if (inspection.cartridgeOrder.length === 0) {
    findings.push({ level: "error", message: "No cartridges were found" })
  }

  const configuredCartridges = project.configuredCartridgePath
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
