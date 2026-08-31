import sfccOxlint from "@commerce-klaus/eslint-config-sfcc/configs/oxlint"
import sfccModules from "@commerce-klaus/vite-plugin-sfcc-modules"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

const configDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    sfccModules({
      basePath: path.join(configDirectory, "cartridges"),
      siteTemplatePath: path.join(configDirectory, "sites/site_template"),
      site: "Example",
    }),
  ],
  lint: {
    ...sfccOxlint.lint,
  },
  run: {
    tasks: {
      lint: {
        command: "vp lint && eslint cartridges",
        dependsOn: ["@commerce-klaus/eslint-config-sfcc#build"],
      },
      test: {
        command: "vp test",
        dependsOn: ["@commerce-klaus/vite-plugin-sfcc-modules#build"],
      },
    },
  },
})
