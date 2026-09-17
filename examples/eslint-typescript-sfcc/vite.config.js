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
      "setup:b2c-plugin": {
        command: "b2c plugins link ../../packages/b2c-plugin --no-install",
        cache: false,
        dependsOn: ["@commerce-klaus/b2c-plugin#build"],
      },
      test: {
        command: "vp test",
        dependsOn: ["@commerce-klaus/vitest-sfcc#build"],
      },
    },
  },
})
