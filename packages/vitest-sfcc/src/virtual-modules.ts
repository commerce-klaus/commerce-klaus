import { type ResolvedHookRegistration } from "@commerce-klaus/sfcc-module-resolver"

import { CARTRIDGE_MODULE_SUFFIX } from "./cartridge-transform.js"

export const VIRTUAL_PREFIX = "\0vitest-sfcc:"

interface VirtualModule {
  moduleId: string
  resolvedPath?: string
}

export function encodeVirtualModule(module: VirtualModule): string {
  return `${VIRTUAL_PREFIX}${Buffer.from(JSON.stringify(module)).toString("base64url")}`
}

function decodeVirtualModule(id: string): VirtualModule {
  return JSON.parse(
    Buffer.from(id.slice(VIRTUAL_PREFIX.length), "base64url").toString(),
  ) as VirtualModule
}

export function loadVirtualModule(
  id: string,
  hookRegistrations: ResolvedHookRegistration[],
): string {
  const { moduleId, resolvedPath } = decodeVirtualModule(id)
  if (moduleId === "dw/system/HookMgr") {
    const imports = hookRegistrations
      .map(
        (registration, index) =>
          `import * as hook${index} from ${JSON.stringify(`${registration.scriptPath}${CARTRIDGE_MODULE_SUFFIX}`)}`,
      )
      .join("\n")
    const registrations = hookRegistrations
      .map(
        (registration, index) =>
          `runtime.registerHook(${JSON.stringify(registration.name)}, "default" in hook${index} ? hook${index}.default : hook${index})`,
      )
      .join("\n")

    return `${imports}
import { getSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"
const runtime = getSfccTestRuntime()
${registrations}
export default runtime.resolve("dw/system/HookMgr")
`
  }

  if (resolvedPath) {
    return `import { getSfccTestRuntime } from "@commerce-klaus/sfcc-test-runtime"
const runtime = getSfccTestRuntime()
let implementation
try {
  implementation = runtime.resolve(${JSON.stringify(moduleId)}, undefined, ${JSON.stringify(resolvedPath)})
} catch {
  const fallback = (await import(${JSON.stringify(`${resolvedPath}${CARTRIDGE_MODULE_SUFFIX}`)})).default
  implementation = runtime.resolve(${JSON.stringify(moduleId)}, () => fallback, ${JSON.stringify(resolvedPath)})
}
export default implementation
`
  }

  return `import { requireSfccModule } from "@commerce-klaus/sfcc-test-runtime"
const implementation = requireSfccModule(${JSON.stringify(moduleId)})
export default implementation
`
}
