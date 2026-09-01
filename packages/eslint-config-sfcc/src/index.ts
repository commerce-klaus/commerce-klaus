import type { Linter } from "eslint"

import oxlint, { oxlintRules } from "./configs/oxlint.js"
import recommended, { createRecommendedConfig } from "./configs/recommended.js"
import {
  createStorefrontConfig,
  pwa,
  sfra,
  sitegenesisControllers,
  sitegenesisPipelines,
  storefrontNext,
} from "./configs/storefront.js"
import sfccPlugin from "./plugins/sfcc/index.js"
import sitegenesis from "./plugins/sitegenesis/index.js"

type Configs = {
  recommended: Linter.Config[]
  "storefront-next": Linter.Config[]
  pwa: Linter.Config[]
  sfra: Linter.Config[]
  "sitegenesis-controllers": Linter.Config[]
  "sitegenesis-pipelines": Linter.Config[]
}

const configs: Configs = {
  recommended,
  "storefront-next": storefrontNext,
  pwa,
  sfra,
  "sitegenesis-controllers": sitegenesisControllers,
  "sitegenesis-pipelines": sitegenesisPipelines,
}

const plugins = {
  sfcc: sfccPlugin,
  sitegenesis,
}

const eslintConfigSfcc: { configs: typeof configs; plugins: typeof plugins } = {
  configs,
  plugins,
}

export {
  configs,
  oxlint,
  oxlintRules,
  plugins,
  recommended,
  sfccPlugin as sfcc,
  storefrontNext,
  pwa,
  sfra,
  sitegenesis,
  sitegenesisControllers,
  sitegenesisPipelines,
}
export { createRecommendedConfig, createStorefrontConfig }
export type { StorefrontConfigOptions, StorefrontPreset } from "./configs/storefront.js"
export default eslintConfigSfcc
