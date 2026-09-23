import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))
const sfccOxlintPluginDirectory = path.join(
  rootDirectory,
  "packages/eslint-config-sfcc/dist/oxlint",
)
const hasSfccOxlintPlugins = fs.existsSync(path.join(sfccOxlintPluginDirectory, "sfcc.mjs"))
const sfccOxlint = hasSfccOxlintPlugins
  ? (await import("./packages/eslint-config-sfcc/dist/configs/oxlint.mjs")).default
  : undefined

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
    jsPlugins: hasSfccOxlintPlugins
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
      : [],
    options: { typeAware: true, typeCheck: true },
    overrides: hasSfccOxlintPlugins
      ? [
          {
            files: ["examples/oxlint-eslint-sfcc/cartridges/**"],
            rules: sfccOxlint!.lint.rules,
          },
        ]
      : [],
  },
  run: {
    cache: true,
    tasks: {
      "docs:build": {
        command: "vitepress build docs",
        dependsOn: ["docs:generate"],
      },
      "docs:generate": {
        command: "node --experimental-strip-types docs/.vitepress/generate-project-graph.ts",
        input: [
          "docs/.vitepress/generate-project-graph.ts",
          "examples/eslint-typescript-sfcc/cartridges/**",
          "packages/b2c-plugin/src/output.ts",
          "packages/sfcc-module-resolver/src/**",
        ],
        output: ["docs/_partials/project-graph.generated.md"],
      },
    },
  },
})
