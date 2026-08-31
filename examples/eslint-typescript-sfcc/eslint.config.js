import { createRecommendedConfig } from "@commerce-klaus/eslint-config-sfcc"
import js from "@eslint/js"
import tseslint from "@typescript-eslint/eslint-plugin"
import sonarjs from "eslint-plugin-sonarjs"
import unicorn from "eslint-plugin-unicorn"
import { defineConfig } from "eslint/config"

export default defineConfig(
  js.configs.recommended,
  tseslint.configs["flat/recommended"],
  {
    plugins: { sonarjs },
    rules: sonarjs.configs.recommended.rules,
  },
  unicorn.configs.recommended,
  {
    files: ["cartridges/**/*.{js,ds}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": "allow-with-description" }], // ignore only because of the Vite+ environment.
      "unicorn/filename-case": ["error", { case: "kebabCase", checkDirectories: false }],
    },
  },
  createRecommendedConfig({
    sfcc: {
      siteTemplatePath: "sites/site_template",
      site: "Example",
    },
  }),
)
