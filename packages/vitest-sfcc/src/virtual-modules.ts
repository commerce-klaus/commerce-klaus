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

function encodeJavaScriptLiteral(value: string): string {
  return JSON.stringify(value).replace(/[<>\u2028\u2029]/g, (character) => {
    switch (character) {
      case "<":
        return "\\u003c"
      case ">":
        return "\\u003e"
      case "\u2028":
        return "\\u2028"
      default:
        return "\\u2029"
    }
  })
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
          `import * as hook${index} from ${encodeJavaScriptLiteral(`${registration.scriptPath}${CARTRIDGE_MODULE_SUFFIX}`)}`,
      )
      .join("\n")
    const registrations = hookRegistrations
      .map(
        (registration, index) =>
          `runtime.registerHook(${encodeJavaScriptLiteral(registration.name)}, "default" in hook${index} ? hook${index}.default : hook${index})`,
      )
      .join("\n")

    return `${imports}
  import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
  const runtime = getSfccRuntime()
${registrations}
export default runtime.resolve("dw/system/HookMgr")
`
  }

  if (resolvedPath) {
    return `import { getSfccRuntime } from "@commerce-klaus/vitest-sfcc/runtime"
  const runtime = getSfccRuntime()
let implementation
try {
  implementation = runtime.resolve(${encodeJavaScriptLiteral(moduleId)}, undefined, ${encodeJavaScriptLiteral(resolvedPath)})
} catch {
  const fallbackModule = await import(${encodeJavaScriptLiteral(`${resolvedPath}${CARTRIDGE_MODULE_SUFFIX}`)})
  const fallback = "default" in fallbackModule ? fallbackModule.default : fallbackModule
  implementation = runtime.resolve(${encodeJavaScriptLiteral(moduleId)}, () => fallback, ${encodeJavaScriptLiteral(resolvedPath)})
}
export default implementation
`
  }

  return `import { requireSfccModule } from "@commerce-klaus/vitest-sfcc/runtime"
const implementation = requireSfccModule(${encodeJavaScriptLiteral(moduleId)})
export default implementation
`
}
