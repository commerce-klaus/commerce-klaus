import type { Rule } from "eslint"

import { resolveCommerceKlausConfig } from "@commerce-klaus/config"

import type { SfccSettings } from "../../types/sfcc-settings.js"

type RuleContextWithSettings = Rule.RuleContext & {
  settings?: { sfcc?: SfccSettings }
}

export function getSfccSettings(context: Rule.RuleContext): SfccSettings {
  const configuredSettings = (context as RuleContextWithSettings).settings?.sfcc ?? {}
  const cwd = getRuleCwd(context)

  return resolveSfccSettings(configuredSettings, cwd)
}

export function getRuleCwd(context: Rule.RuleContext): string {
  return (
    (context as Rule.RuleContext & { cwd?: string }).cwd ??
    (context as Rule.RuleContext & { getCwd?: () => string }).getCwd?.() ??
    process.cwd()
  )
}

export function resolveSfccSettings(
  configuredSettings: SfccSettings = {},
  cwd: string = process.cwd(),
): SfccSettings {
  const centralConfig = resolveCommerceKlausConfig({
    cwd,
    configFile: configuredSettings.configFile,
    overrides: configuredSettings,
  })

  return { ...centralConfig, ...configuredSettings }
}

export function withSfccSettings(
  createWithSettings: (context: Rule.RuleContext, sfccSettings: SfccSettings) => Rule.RuleListener,
): (context: Rule.RuleContext) => Rule.RuleListener {
  return (context) => createWithSettings(context, getSfccSettings(context))
}
