import fs from "node:fs"
import path from "node:path"

import { resolveCartridgeRoots, resolveCartridgesDir } from "./cartridge-order.ts"
import { findCustomApiDefinitions } from "./custom-api.ts"
import { findResolvedHookRegistrations } from "./hooks.ts"
import { resolveCandidateFile, toPosixPath } from "./module-resolution.ts"
import { findSfraControllers } from "./sfra-controller.ts"
import { findResolvedStepTypeDefinitions } from "./step-types.ts"
import { resolveSuperModuleFilePath } from "./super-module.ts"

export type SfccProjectGraphNodeKind =
  | "cartridge"
  | "custom-api"
  | "hook"
  | "job-step"
  | "module"
  | "route"
  | "schema"

export type SfccProjectGraphEdgeKind =
  | "implements"
  | "overrides"
  | "precedes"
  | "registers"
  | "appends"
  | "prepends"
  | "replaces"
  | "super-module"
  | "uses-schema"

export interface SfccProjectGraphNode {
  id: string
  kind: SfccProjectGraphNodeKind
  label: string
  path?: string
}

export interface SfccProjectGraphEdge {
  from: string
  kind: SfccProjectGraphEdgeKind
  to: string
}

export interface SfccProjectGraph {
  cartridgesDirectory: string
  cartridgeOrder: string[]
  module?: string
  nodes: SfccProjectGraphNode[]
  edges: SfccProjectGraphEdge[]
}

export interface CreateSfccProjectGraphOptions {
  cartridgesDir: string
  cwd?: string
  cartridgePath?: string[]
  module?: string
}

export function createSfccProjectGraph(options: CreateSfccProjectGraphOptions): SfccProjectGraph {
  const cwd = options.cwd ?? process.cwd()
  const cartridgesDirectory = resolveCartridgesDir(options.cartridgesDir, cwd)
  const cartridgeOrder = resolveCartridgeRoots({
    basePath: options.cartridgesDir,
    cwd,
    cartridgePath: options.cartridgePath,
  })
  const nodes = new Map<string, SfccProjectGraphNode>()
  const edges: SfccProjectGraphEdge[] = []

  for (const cartridgeRoot of cartridgeOrder) {
    addNode(nodes, {
      id: fileNodeId("cartridge", cartridgeRoot),
      kind: "cartridge",
      label: path.basename(cartridgeRoot),
      path: cartridgeRoot,
    })
  }
  for (let index = 0; index < cartridgeOrder.length - 1; index += 1) {
    edges.push({
      from: fileNodeId("cartridge", cartridgeOrder[index]),
      kind: "precedes",
      to: fileNodeId("cartridge", cartridgeOrder[index + 1]),
    })
  }

  addSuperModuleRelationships(nodes, edges, cartridgeOrder, options.module)

  if (!options.module) {
    addContractRelationships(nodes, edges, cartridgesDirectory, cartridgeOrder)
  }

  return {
    cartridgesDirectory,
    cartridgeOrder,
    ...(options.module ? { module: options.module } : {}),
    nodes: [...nodes.values()],
    edges,
  }
}

function addSuperModuleRelationships(
  nodes: Map<string, SfccProjectGraphNode>,
  edges: SfccProjectGraphEdge[],
  cartridgeRoots: string[],
  moduleName: string | undefined,
): void {
  const sourceFiles = moduleName
    ? findModuleCandidates(moduleName, cartridgeRoots)
    : cartridgeRoots.flatMap(findSuperModuleSources)

  if (moduleName) {
    for (let index = 0; index < sourceFiles.length - 1; index += 1) {
      addModuleNode(nodes, sourceFiles[index], cartridgeRoots)
      addModuleNode(nodes, sourceFiles[index + 1], cartridgeRoots)
      edges.push({
        from: fileNodeId("module", sourceFiles[index]),
        kind: "overrides",
        to: fileNodeId("module", sourceFiles[index + 1]),
      })
    }
  }

  for (const sourceFile of sourceFiles) {
    addModuleNode(nodes, sourceFile, cartridgeRoots)
    const targetFile = resolveSuperModuleFilePath(sourceFile, cartridgeRoots)
    if (!targetFile || !fileUsesSuperModule(sourceFile)) {
      continue
    }

    addModuleNode(nodes, targetFile, cartridgeRoots)
    edges.push({
      from: fileNodeId("module", sourceFile),
      kind: "super-module",
      to: fileNodeId("module", targetFile),
    })
  }
}

function addContractRelationships(
  nodes: Map<string, SfccProjectGraphNode>,
  edges: SfccProjectGraphEdge[],
  cartridgesDirectory: string,
  cartridgeRoots: string[],
): void {
  addSfraControllerRelationships(nodes, edges, cartridgeRoots)

  for (const hook of findResolvedHookRegistrations(cartridgeRoots)) {
    const hookId = `hook:${hook.name}`
    addNode(nodes, { id: hookId, kind: "hook", label: hook.name })
    addModuleNode(nodes, hook.scriptPath, cartridgeRoots)
    edges.push({ from: hookId, kind: "implements", to: fileNodeId("module", hook.scriptPath) })
  }

  for (const jobStep of findResolvedStepTypeDefinitions(cartridgeRoots)) {
    const jobStepId = `job-step:${jobStep.typeId}`
    addNode(nodes, { id: jobStepId, kind: "job-step", label: jobStep.typeId })
    addModuleNode(nodes, jobStep.modulePath, cartridgeRoots)
    edges.push({
      from: jobStepId,
      kind: "implements",
      to: fileNodeId("module", jobStep.modulePath),
    })
  }

  for (const customApi of findCustomApiDefinitions(cartridgesDirectory)) {
    const customApiId = `custom-api:${customApi.apiJsonPath}#${customApi.endpoint}`
    const schemaId = fileNodeId("schema", customApi.schemaPath)
    addNode(nodes, {
      id: customApiId,
      kind: "custom-api",
      label: customApi.endpoint,
      path: customApi.apiJsonPath,
    })
    addNode(nodes, {
      id: schemaId,
      kind: "schema",
      label: path.basename(customApi.schemaPath),
      path: customApi.schemaPath,
    })
    edges.push({ from: customApiId, kind: "uses-schema", to: schemaId })
  }
}

function addSfraControllerRelationships(
  nodes: Map<string, SfccProjectGraphNode>,
  edges: SfccProjectGraphEdge[],
  cartridgeRoots: string[],
): void {
  const controllers = findSfraControllers(cartridgeRoots)
  const routeMethods = new Map<string, string>()
  for (const controller of controllers) {
    for (const route of controller.routes) {
      if (route.action === "get" || route.action === "post") {
        routeMethods.set(`${controller.name}:${route.name}`, route.action.toUpperCase())
      }
    }
  }

  for (const controller of controllers) {
    addModuleNode(nodes, controller.filePath, cartridgeRoots)
    for (const route of controller.routes) {
      const routeKey = `${controller.name}:${route.name}`
      const routeId = `route:${routeKey}`
      const method = routeMethods.get(routeKey)
      addNode(nodes, {
        id: routeId,
        kind: "route",
        label: `${method ? `${method} ` : ""}${controller.name}-${route.name}`,
      })
      edges.push({
        from: fileNodeId("module", controller.filePath),
        kind: route.action === "get" || route.action === "post" ? "registers" : `${route.action}s`,
        to: routeId,
      })
    }
  }
}

function findModuleCandidates(moduleName: string, cartridgeRoots: string[]): string[] {
  if (!moduleName.startsWith("*/") || moduleName.length === 2) {
    throw new Error("--module must use the */cartridge/... module form")
  }

  return cartridgeRoots.flatMap((cartridgeRoot) => {
    const candidate = resolveCandidateFile(
      path.join(cartridgeRoot, moduleName.slice(2)),
      moduleName,
    )
    return candidate ? [candidate] : []
  })
}

function findSuperModuleSources(cartridgeRoot: string): string[] {
  const cartridgeDirectory = path.join(cartridgeRoot, "cartridge")
  if (!fs.existsSync(cartridgeDirectory)) {
    return []
  }

  const sourceFiles: string[] = []
  const directories = [cartridgeDirectory]
  while (directories.length > 0) {
    const directory = directories.shift()
    if (!directory) {
      continue
    }

    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        directories.push(entryPath)
      } else if (entry.isFile() && [".ds", ".js"].includes(path.extname(entry.name))) {
        if (fileUsesSuperModule(entryPath)) {
          sourceFiles.push(entryPath)
        }
      }
    }
  }

  return sourceFiles
}

function fileUsesSuperModule(filePath: string): boolean {
  return fs.readFileSync(filePath, "utf8").includes("module.superModule")
}

function addModuleNode(
  nodes: Map<string, SfccProjectGraphNode>,
  filePath: string,
  cartridgeRoots: string[],
): void {
  const cartridgeRoot = cartridgeRoots.find((root) => filePath.startsWith(`${root}${path.sep}`))
  const label = cartridgeRoot
    ? `${path.basename(cartridgeRoot)}/${toPosixPath(path.relative(cartridgeRoot, filePath))}`
    : path.basename(filePath)
  addNode(nodes, {
    id: fileNodeId("module", filePath),
    kind: "module",
    label,
    path: filePath,
  })
}

function addNode(nodes: Map<string, SfccProjectGraphNode>, node: SfccProjectGraphNode): void {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node)
  }
}

function fileNodeId(kind: "cartridge" | "module" | "schema", filePath: string): string {
  return `${kind}:${filePath}`
}
