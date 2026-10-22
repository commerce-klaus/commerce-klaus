import { type ResolvedHookRegistration } from "@commerce-klaus/sfcc-module-resolver/hooks"
import { getSfccTestRuntime, type SfccHookImplementation } from "@commerce-klaus/sfcc-test-runtime"

import { CARTRIDGE_MODULE_SUFFIX } from "./cartridge-transform.js"

const ACTIVE_HOOKS = Symbol.for("@commerce-klaus/vitest-sfcc.hooks")
export const HOOK_REGISTRATIONS_DEFINE = "__COMMERCE_KLAUS_HOOK_REGISTRATIONS__"

declare const __COMMERCE_KLAUS_HOOK_REGISTRATIONS__: ResolvedHookRegistration[] | undefined

type HookGlobal = typeof globalThis & {
  [ACTIVE_HOOKS]?: ResolvedHookRegistration[]
}

declare global {
  namespace SfccHooks {
    interface Definitions {}
  }
}

type RegisteredHookName = Extract<keyof SfccHooks.Definitions, string>
type RegisteredHookFunction<HookName extends string> = HookName extends RegisteredHookName
  ? SfccHooks.Definitions[HookName]
  : (...args: unknown[]) => unknown
type HookArguments<HookName extends string> =
  RegisteredHookFunction<HookName> extends (...args: infer Arguments) => unknown
    ? Arguments
    : unknown[]
type HookResult<HookName extends string> =
  RegisteredHookFunction<HookName> extends (...args: never[]) => infer Result ? Result : unknown
type LastSegment<Value extends string> = Value extends `${string}.${infer Tail}`
  ? LastSegment<Tail>
  : Value

export type SfccHookMethodName<HookName extends string> = HookName extends RegisteredHookName
  ? LastSegment<HookName>
  : string

export interface SfccLoadedHook<HookName extends string = string> {
  readonly definition: ResolvedHookRegistration
  readonly hookName: HookName
  call(method: SfccHookMethodName<HookName>, ...args: HookArguments<HookName>): HookResult<HookName>
}

export function setActiveHooks(registrations: ResolvedHookRegistration[]): void {
  ;(globalThis as HookGlobal)[ACTIVE_HOOKS] = registrations
}

function getActiveHooks(): ResolvedHookRegistration[] {
  const activeHooks = (globalThis as HookGlobal)[ACTIVE_HOOKS]
  if (activeHooks) {
    return activeHooks
  }

  return typeof __COMMERCE_KLAUS_HOOK_REGISTRATIONS__ === "undefined"
    ? []
    : __COMMERCE_KLAUS_HOOK_REGISTRATIONS__
}

function findHookRegistration(hookName: string): ResolvedHookRegistration {
  const registrations = getActiveHooks()
  const registration = registrations.find((candidate) => candidate.name === hookName)
  if (registration) {
    return registration
  }

  const availableHooks = registrations.map((candidate) => candidate.name).sort()
  throw new Error(
    `vitest-sfcc could not find hook ${hookName}. Available hooks: ${
      availableHooks.join(", ") || "none"
    }.`,
  )
}

export async function loadSfccHook<HookName extends string>(
  hookName: HookName,
): Promise<SfccLoadedHook<HookName>> {
  const definition = findHookRegistration(hookName)
  const importedModule = (await import(
    /* @vite-ignore */ `${definition.scriptPath}${CARTRIDGE_MODULE_SUFFIX}`
  )) as SfccHookImplementation & { default?: unknown }
  const defaultExport = importedModule.default
  const implementation =
    typeof defaultExport === "object" && defaultExport !== null
      ? { ...defaultExport, ...importedModule }
      : importedModule

  return {
    definition,
    hookName,
    call: (method, ...args) => {
      if (typeof implementation[method] !== "function") {
        throw new Error(`SFCC hook ${hookName} does not export function ${method}.`)
      }

      const runtime = getSfccTestRuntime()
      runtime.registerHook(hookName, implementation)
      return runtime.callHook(hookName, method, ...args) as HookResult<HookName>
    },
  }
}
