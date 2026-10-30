import {
  createCartridgeArchitectureConfig,
  createRecommendedConfig,
  createSfccTestConfig,
} from "@commerce-klaus/eslint-config-sfcc"
import js from "@eslint/js"
import tseslint from "@typescript-eslint/eslint-plugin"
import sonarjs from "eslint-plugin-sonarjs"
import unicorn from "eslint-plugin-unicorn"
import { defineConfig } from "eslint/config"

export default defineConfig(
  {
    files: ["cartridges/**/*.{js,ds}"],
    extends: [
      js.configs.recommended,
      tseslint.configs["flat/recommended"],
      {
        plugins: { sonarjs },
        rules: sonarjs.configs.recommended.rules,
      },
      unicorn.configs.recommended,
    ],
    rules: {
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": "allow-with-description" }], // ignore only because of the Vite+ environment.
      "unicorn/filename-case": ["error", { case: "kebabCase", checkDirectories: false }],
    },
  },
  createRecommendedConfig(),
  createCartridgeArchitectureConfig(),
  createSfccTestConfig(),
  {
    files: ["tests/**/*.js"],
    rules: {
      "sfcc-test/require-file-extension": "warn",
      "sfcc-test/require-runtime-cleanup": "warn",
      "sfcc-test/no-stale-runtime-reference": "warn",
    },
  },
  {
    files: ["cartridges/*/cartridge/controllers/*.js"],
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-top-level-side-effects": "off",
    },
  },
)
