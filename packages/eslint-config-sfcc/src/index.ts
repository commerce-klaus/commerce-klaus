import type { Linter } from "eslint"

import {
  compatibility21_2,
  compatibility22_7,
  createCompatibilityConfig,
} from "./configs/compatibility.js"
import generatedTypes, { createGeneratedTypesConfig } from "./configs/generated-types.js"
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
  "compatibility-21.2": Linter.Config[]
  "compatibility-22.7": Linter.Config[]
  "generated-types": Linter.Config[]
  recommended: Linter.Config[]
  "storefront-next": Linter.Config[]
  pwa: Linter.Config[]
  sfra: Linter.Config[]
  "sitegenesis-controllers": Linter.Config[]
  "sitegenesis-pipelines": Linter.Config[]
}

const configs: Configs = {
  "compatibility-21.2": compatibility21_2,
  "compatibility-22.7": compatibility22_7,
  "generated-types": generatedTypes,
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
  compatibility21_2,
  compatibility22_7,
  configs,
  generatedTypes,
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
export {
  createCompatibilityConfig,
  createGeneratedTypesConfig,
  createRecommendedConfig,
  createStorefrontConfig,
}
export type { CompatibilityConfigOptions, CompatibilityVersion } from "./configs/compatibility.js"
export type { GeneratedTypesConfigOptions } from "./configs/generated-types.js"
export type { StorefrontConfigOptions, StorefrontPreset } from "./configs/storefront.js"
export default eslintConfigSfcc
