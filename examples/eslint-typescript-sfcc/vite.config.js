import sfccVitest from "@commerce-klaus/vitest-sfcc"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

const configDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    sfccVitest({
      basePath: path.join(configDirectory, "cartridges"),
      siteTemplatePath: path.join(configDirectory, "sites/site_template"),
      site: "Example",
    }),
  ],
  run: {
    tasks: {
      test: {
        command: "vp test",
        dependsOn: ["@commerce-klaus/vitest-sfcc#build"],
      },
    },
  },
})
