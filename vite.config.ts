import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

import sfccOxlint from "./packages/eslint-config-sfcc/src/configs/oxlint.js"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))
const sfccOxlintPluginDirectory = path.join(
  rootDirectory,
  "packages/eslint-config-sfcc/dist/oxlint",
)
const hasSfccOxlintPlugins = fs.existsSync(path.join(sfccOxlintPluginDirectory, "sfcc.mjs"))

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    semi: false,
    sortImports: {
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
    },
  },
  lint: {
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      ...(hasSfccOxlintPlugins
        ? [
            {
              name: "sfcc",
              specifier: path.join(sfccOxlintPluginDirectory, "sfcc.mjs"),
            },
            {
              name: "sitegenesis",
              specifier: path.join(sfccOxlintPluginDirectory, "sitegenesis.mjs"),
            },
          ]
        : []),
    ],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: hasSfccOxlintPlugins
      ? [
          {
            files: ["examples/oxlint-eslint-sfcc/cartridges/**"],
            rules: sfccOxlint.lint.rules,
          },
        ]
      : [],
  },
  run: {
    cache: true,
  },
})
