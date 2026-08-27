import type { Linter } from "eslint"

import oxlint, { oxlintRules } from "./configs/oxlint.js"
import recommended, { createRecommendedConfig } from "./configs/recommended.js"
import sfccPlugin from "./plugins/sfcc/index.js"
import sitegenesis from "./plugins/sitegenesis/index.js"

const configs: { recommended: Linter.Config[] } = {
  recommended,
}

const plugins = {
  sfcc: sfccPlugin,
  sitegenesis,
}

const eslintConfigSfcc: { configs: typeof configs; plugins: typeof plugins } = {
  configs,
  plugins,
}

export { configs, oxlint, oxlintRules, plugins, recommended, sfccPlugin as sfcc, sitegenesis }
export { createRecommendedConfig }
export default eslintConfigSfcc
