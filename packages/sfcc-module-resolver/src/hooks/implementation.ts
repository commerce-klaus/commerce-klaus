import fs from "node:fs"
import path from "node:path"

export interface HookRegistration {
  name: string
  script: string
}

export interface ResolvedHookRegistration extends HookRegistration {
  scriptPath: string
}

function isHookRegistration(value: unknown): value is HookRegistration {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as HookRegistration).name === "string" &&
    (value as HookRegistration).name.length > 0 &&
    typeof (value as HookRegistration).script === "string" &&
    (value as HookRegistration).script.length > 0
  )
}

export function getHookRegistrationsFromDocument(
  document: unknown,
): HookRegistration[] | undefined {
  if (typeof document !== "object" || document === null || !("hooks" in document)) {
    return undefined
  }

  const hooks = (document as { hooks: unknown }).hooks
  return Array.isArray(hooks) && hooks.every(isHookRegistration) ? hooks : undefined
}

const HOOK_SCRIPT_EXTENSIONS = [".js", ".cjs", ".mjs", ".ds"]

export function resolveHookScriptPath(hooksDirectory: string, script: string): string | undefined {
  const requestedPath = path.resolve(hooksDirectory, script)
  const candidates = [
    requestedPath,
    ...HOOK_SCRIPT_EXTENSIONS.map((extension) => `${requestedPath}${extension}`),
  ]

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile()
    } catch {
      return false
    }
  })
}

export function getRequiredHookExportName(hookName: string): string | undefined {
  return hookName.startsWith("dw.") ? hookName.split(".").at(-1) : undefined
}

// A file belongs to exactly one cartridge: the directory directly under "cartridges".
export function findCartridgeRootForFile(filePath: string): string | undefined {
  let current = path.dirname(path.resolve(filePath))

  while (true) {
    const parent = path.dirname(current)
    if (path.basename(parent) === "cartridges") {
      return current
    }

    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

export function getCartridgeHooksJsonPath(cartridgeRoot: string): string | undefined {
  const packagePath = path.join(cartridgeRoot, "package.json")
  if (!fs.existsSync(packagePath)) {
    return undefined
  }

  let packageJson: { hooks?: unknown }
  try {
    packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { hooks?: unknown }
  } catch {
    return undefined
  }

  if (typeof packageJson.hooks !== "string" || packageJson.hooks.length === 0) {
    return undefined
  }

  return path.resolve(cartridgeRoot, packageJson.hooks)
}

export function findResolvedHookRegistrations(
  cartridgeRoots: string[],
): ResolvedHookRegistration[] {
  const registrations: ResolvedHookRegistration[] = []
  const registeredExtensionPoints = new Set<string>()

  for (const cartridgeRoot of cartridgeRoots) {
    const hooksJsonPath = getCartridgeHooksJsonPath(cartridgeRoot)
    if (!hooksJsonPath) {
      continue
    }

    let cartridgeRegistrations: HookRegistration[] | undefined
    try {
      cartridgeRegistrations = getHookRegistrationsFromDocument(
        JSON.parse(fs.readFileSync(hooksJsonPath, "utf8")),
      )
    } catch {
      continue
    }

    if (!cartridgeRegistrations) {
      continue
    }

    for (const registration of cartridgeRegistrations) {
      if (registeredExtensionPoints.has(registration.name)) {
        continue
      }

      const scriptPath = resolveHookScriptPath(path.dirname(hooksJsonPath), registration.script)
      if (!scriptPath) {
        continue
      }

      registeredExtensionPoints.add(registration.name)
      registrations.push({ ...registration, scriptPath })
    }
  }

  return registrations
}

export interface RequiredHookExport {
  hookName: string
  exportName: string
}

export function getHookRegistrationsForScriptFile(filePath: string): HookRegistration[] {
  const cartridgeRoot = findCartridgeRootForFile(filePath)
  if (!cartridgeRoot) {
    return []
  }

  const hooksJsonPath = getCartridgeHooksJsonPath(cartridgeRoot)
  if (!hooksJsonPath) {
    return []
  }

  let registrations: HookRegistration[] | undefined
  try {
    registrations = getHookRegistrationsFromDocument(
      JSON.parse(fs.readFileSync(hooksJsonPath, "utf8")),
    )
  } catch {
    return []
  }

  if (!registrations) {
    return []
  }

  const hooksDirectory = path.dirname(hooksJsonPath)
  const normalizedFilePath = path.resolve(filePath)

  return registrations.filter((registration) => {
    const resolvedScriptPath = resolveHookScriptPath(hooksDirectory, registration.script)
    return resolvedScriptPath === normalizedFilePath
  })
}

export function getRequiredHookExportsForScriptFile(filePath: string): RequiredHookExport[] {
  const requiredExports: RequiredHookExport[] = []
  for (const registration of getHookRegistrationsForScriptFile(filePath)) {
    const exportName = getRequiredHookExportName(registration.name)
    if (exportName) {
      requiredExports.push({ hookName: registration.name, exportName })
    }
  }

  return requiredExports
}
