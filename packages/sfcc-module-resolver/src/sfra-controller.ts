import { parse, type Node } from "acorn"
import { simple } from "acorn-walk"
import fs from "node:fs"
import path from "node:path"

export type SfraControllerRouteAction = "append" | "get" | "post" | "prepend" | "replace"

export interface SfraControllerRouteRegistration {
  action: SfraControllerRouteAction
  middlewareCount: number
  name: string
}

export interface SfraControllerDefinition {
  filePath: string
  name: string
  routes: SfraControllerRouteRegistration[]
}

type AstNode = Node & Record<string, unknown>

const ROUTE_ACTIONS = new Set<SfraControllerRouteAction>([
  "append",
  "get",
  "post",
  "prepend",
  "replace",
])

export function parseSfraController(
  filePath: string,
  sourceCode: string,
): SfraControllerDefinition | undefined {
  const ast = parse(sourceCode, {
    allowHashBang: true,
    ecmaVersion: "latest",
    sourceType: "script",
  })
  const serverBindings = new Set<string>()

  simple(ast, {
    VariableDeclarator(node) {
      const declaration = node as unknown as AstNode
      const identifier = declaration.id as AstNode | undefined
      const initializer = declaration.init as AstNode | undefined
      if (
        identifier?.type === "Identifier" &&
        initializer?.type === "CallExpression" &&
        isRequireServerCall(initializer)
      ) {
        serverBindings.add(identifier.name as string)
      }
    },
  })

  if (serverBindings.size === 0) {
    return undefined
  }

  const routes: SfraControllerRouteRegistration[] = []
  simple(ast, {
    CallExpression(node) {
      const call = node as unknown as AstNode
      const callee = call.callee as AstNode | undefined
      if (callee?.type !== "MemberExpression" || callee.computed) {
        return
      }

      const object = callee.object as AstNode | undefined
      const property = callee.property as AstNode | undefined
      const action = property?.type === "Identifier" ? (property.name as string) : undefined
      if (
        object?.type !== "Identifier" ||
        !serverBindings.has(object.name as string) ||
        !action ||
        !ROUTE_ACTIONS.has(action as SfraControllerRouteAction)
      ) {
        return
      }

      const arguments_ = call.arguments as AstNode[]
      const routeName = literalString(arguments_[0])
      if (!routeName) {
        return
      }

      routes.push({
        action: action as SfraControllerRouteAction,
        middlewareCount: Math.max(0, arguments_.length - 1),
        name: routeName,
      })
    },
  })

  return routes.length > 0
    ? { filePath, name: path.basename(filePath, path.extname(filePath)), routes }
    : undefined
}

export function findSfraControllers(cartridgeRoots: string[]): SfraControllerDefinition[] {
  const controllers: SfraControllerDefinition[] = []

  for (const cartridgeRoot of cartridgeRoots) {
    const controllersDirectory = path.join(cartridgeRoot, "cartridge", "controllers")
    if (!fs.existsSync(controllersDirectory)) {
      continue
    }

    for (const entry of fs.readdirSync(controllersDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || ![".ds", ".js"].includes(path.extname(entry.name))) {
        continue
      }

      const filePath = path.join(controllersDirectory, entry.name)
      try {
        const controller = parseSfraController(filePath, fs.readFileSync(filePath, "utf8"))
        if (controller) {
          controllers.push(controller)
        }
      } catch {
        // Project validation owns syntax diagnostics; graph discovery skips malformed modules.
      }
    }
  }

  return controllers
}

function isRequireServerCall(node: AstNode): boolean {
  const callee = node.callee as AstNode | undefined
  const arguments_ = node.arguments as AstNode[]
  return (
    callee?.type === "Identifier" &&
    callee.name === "require" &&
    arguments_.length === 1 &&
    literalString(arguments_[0]) === "server"
  )
}

function literalString(node: AstNode | undefined): string | undefined {
  return node?.type === "Literal" && typeof node.value === "string" ? node.value : undefined
}
