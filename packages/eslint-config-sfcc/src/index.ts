import type { Linter } from "eslint"

import eslintAfterOxlint, { createEslintAfterOxlintConfig } from "./configs/eslint-after-oxlint.js"
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

export {
  configs,
  eslintAfterOxlint,
  oxlint,
  oxlintRules,
  plugins,
  recommended,
  sfccPlugin as sfcc,
  sitegenesis,
}
export { createEslintAfterOxlintConfig, createRecommendedConfig }
export default eslintConfigSfcc
