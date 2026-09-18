export interface SfccSettings {
  allowBareModules?: string[]
  checkCartridgeExists?: boolean
  cartridgesDir?: string
  cartridgePath?: string[]
  siteTemplatePath?: string
  site?: string
  solutionConfigPath?: string
  envCartridgePath?: string
  configFile?: string | false
}
